import EventEmitter from 'eventemitter3';
import { isEqual } from 'lodash';
import { CookieJar } from 'tough-cookie';

// Shared includes
import { Context, ProxyManager, WebhookManager, createLogger } from './common';
import { Platforms, Manager, Task } from './constants';

// Shopify includes
import {
  Monitor as ShopifyMonitor,
  Task as ShopifyTask,
  RateFetcher,
  Discord as ShopifyDiscord,
  Slack as ShopifySlack,
  TaskTypes,
  HookTypes,
  ParseType,
} from './shopify';
import { getParseType } from './shopify/utils/parse';

// Supreme includes
import {
  Monitor as SupremeMonitor,
  Task as SupremeTask,
  Discord as SupremeDiscord,
  Slack as SupremeSlack,
} from './supreme';

const { Events } = Manager;
const { Events: TaskEvents } = Task;

export default class TaskManager {
  get logPath() {
    return this._logPath;
  }

  get proxyManager() {
    return this._proxyManager;
  }

  get webhookManager() {
    return this._webhookManager;
  }

  constructor(logPath) {
    // Event Emitter for this manager
    this._events = new EventEmitter();

    // Logger file path
    this._logPath = logPath;

    // Tasks Map
    this._tasks = {};

    // Monitors Map
    this._monitors = {};

    // Handlers Map
    this._handlers = {};

    // Captcha Map
    this._captchaQueues = new Map();

    // Token Queues
    this._tokenReserveQueue = {};

    // Logger
    this._logger = createLogger({
      dir: this._logPath,
      name: 'TaskManager',
      prefix: 'manager',
    });

    this._proxyManager = new ProxyManager(this._logger);
    this._webhookManager = new WebhookManager(this._logger);

    this.productInterval = null;

    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
    this._proxyManager._events.on(Events.DeregisterProxy, this.handleDeregisterProxy, this);
  }

  // MARK: Event Related Methods

  /**
   * Register a listener for status events
   *
   * @param {Callback} callback
   */
  registerForTaskEvents(callback) {
    this._events.on('status', callback);
  }

  /**
   * Remove a listener from status events
   *
   * @param {Callback} callback
   */
  deregisterForTaskEvents(callback) {
    this._events.removeListener('status', callback);
  }

  /**
   * Harvest Captcha
   *
   * Harvest a given captcha token for a given task
   *
   * @param {String} id the task to update
   * @param {String} token the captcha token to harvest
   */
  harvestCaptchaToken(_, token, sitekey) {
    // Check if we have tokens to pass through
    this._logger.debug(
      'TaskManager: Reserve queue length: %s',
      this._tokenReserveQueue[sitekey].length,
    );
    if (this._tokenReserveQueue[sitekey] && this._tokenReserveQueue[sitekey].length) {
      // Get the next task to pass the token
      const { id, priority } = this._tokenReserveQueue[sitekey].shift();
      this._logger.debug('TaskManager: Grabbed requester: %s with priority %s', id, priority);
      // Use the task id to get the container
      const container = this._captchaQueues.get(id);
      if (!container) {
        // The current container no longer exists in the captcha queue,
        // Call recursively to get the next task
        this._logger.debug('TaskManager: Task not found! Recursive calling next task');
        this.harvestCaptchaToken(id, token, sitekey);
      }
      // Send event to pass data to task
      this._logger.debug('TaskManager: Sending token to %s', id);
      this._events.emit(Events.Harvest, id, token);

      // stop the harvester for that task..
      this.handleStopHarvest(id, sitekey);
    }
  }

  /**
   * Handle Proxy Swapping Events from task
   *
   * @param {String} id
   * @param {Object} proxy
   */
  async handleSwapProxy(id, proxy) {
    this._logger.debug('Swapping proxy: %j for task %s', proxy, id);

    const proxyId = proxy ? proxy.id : null;
    const { site, platform } = this._tasks[id];
    const newProxy = await this._proxyManager.swap(id, proxyId, site, platform);
    this._events.emit(Events.SendProxy, id, newProxy);
  }

  async handleProduct(ids, product, parseType) {
    const interval = setInterval(() => {
      this._logger.debug('Notifying IDs: %j', ids);
      return Promise.all(
        // eslint-disable-next-line array-callback-return
        [...ids].map(id => {
          const task = Object.values(this._tasks).find(t => t.id === id);

          if (!task || (task && task._aborted)) {
            clearInterval(interval);
          }

          this._events.emit(Events.ProductFound, id, product, parseType);
        }),
      );
    }, 500);
  }

  async handleDeregisterProxy(ids) {
    // eslint-disable-next-line array-callback-return
    return Object.values(ids).map(id => {
      const task = this._tasks[id];
      // const monitor = this._monitors[id];

      // if there's no task running, just exit early..
      if (!task) {
        return;
      }

      this._events.emit(Events.DeregisterProxy, task.id);
    });
  }

  async handleWebhook(hooks = {}) {
    if (hooks instanceof Array) {
      hooks.map(async hook => {
        if (hook) {
          this._webhookManager.insert(hook);
          await this._webhookManager.send();
        }
      });
    }
    const { embed, client } = hooks;
    if (client) {
      this._webhookManager.insert({ embed, client });
      return this._webhookManager.send();
    }
    return null;
  }

  static async _compareProductInput(product1, product2, parseType) {
    // we only care about keywords/url matching here...
    switch (parseType) {
      case ParseType.Keywords: {
        const { pos_keywords: posKeywords, neg_keywords: negKeywords } = product1;
        const samePositiveKeywords = isEqual(product2.pos_keywords.sort(), posKeywords.sort());
        const sameNegativeKeywords = isEqual(product2.neg_keywords.sort(), negKeywords.sort());
        return samePositiveKeywords && sameNegativeKeywords;
      }
      case ParseType.Url: {
        const { url } = product1;
        return product2.url.toUpperCase() === url.toUpperCase();
      }
      case ParseType.Variant: {
        return product1.variant === product2.variant;
      }
      default:
        return false;
    }
  }

  // only called when oneCheckout is enabled for that task that checks out
  async handleSuccess(task) {
    // eslint-disable-next-line array-callback-return
    return Object.values(this._tasks).map(r => {
      // if we are using the same profile, emit the abort event
      this._logger.debug(
        'ONE CHECKOUT: Same profile?: %j, Same site?: %j, Same product?: %j',
        r.task.profile.id === task.profile.id,
        r.task.site === task.site.url,
        TaskManager._compareProductInput(task.product, r.task.product),
      );

      if (
        r.task.profile.id === task.profile.id &&
        r.task.site === task.site.url &&
        TaskManager._compareProductInput(task.product, r.task.product)
      ) {
        this._events.emit(
          'status',
          task.id,
          { message: 'Profile already used!', status: 'used' },
          TaskEvents.TaskStatus,
        );
        this.stop(r.task);
      }
    });
  }

  /**
   * Start Harvesting Captcha
   *
   * Register and retrieve a captcha token for the given id. If
   * the captcha harvesting has not started for this task, it will be
   * started.
   *
   * @param {String} id the task for which to register captcha events
   */
  handleStartHarvest(id, sitekey, host, priority) {
    this._logger.debug('TaskManager: Inserting %s requester with %s priority', id, priority);
    let container = this._captchaQueues.get(id);
    if (!container) {
      // We haven't started harvesting for this task yet, create a queue and start harvesting
      container = {};
      // Store the container on the captcha queue map
      this._captchaQueues.set(id, container);

      if (!this._tokenReserveQueue[sitekey]) {
        this._tokenReserveQueue[sitekey] = [];
        this._logger.debug('TaskManager: Pushing %s to first place in line', id);
        // Add the task to the back of the token reserve queue
        this._tokenReserveQueue[sitekey].push({ id, host, priority });

        this._events.emit(Events.StartHarvest, id, sitekey, host);
        return;
      }

      let contains = false;
      // priority checks...
      this._logger.debug(
        'TaskManager: Reserve queue length: %s',
        this._tokenReserveQueue[sitekey].length,
      );
      for (let i = 0; i < this._tokenReserveQueue[sitekey].length; i += 1) {
        // if the new items priority is less than, splice it in place.
        if (this._tokenReserveQueue[sitekey][i].priority > priority) {
          this._logger.debug('TaskManager: Inserting %s as: %s place in line', id, i);
          this._tokenReserveQueue[sitekey].splice(i, 0, { id, priority });
          contains = true;
          break;
        }
      }

      if (!contains) {
        this._logger.debug('TaskManager: Pushing %s to last place in line', id);
        // Add the task to the back of the token reserve queue
        this._tokenReserveQueue[sitekey].push({ id, priority });
      }

      // Emit an event to start harvesting
      this._events.emit(Events.StartHarvest, id, sitekey, host);
    }
  }

  /**
   * Stop Harvesting Captchas
   *
   * Deregister this id from looking for captcha tokens and send an
   * event to stop harvesting captchas for this id.
   *
   * If the task was not previously harvesting captchas, this method does
   * nothing.
   */
  handleStopHarvest(id, sitekey) {
    const container = this._captchaQueues.get(id);

    // If this container was never started, there's no need to do anything further
    if (!container) {
      return;
    }

    // FYI this will reject all calls currently waiting for a token
    this._captchaQueues.delete(id);

    if (this._tokenReserveQueue[sitekey]) {
      this._tokenReserveQueue[sitekey] = this._tokenReserveQueue[sitekey].filter(
        ({ id: tId }) => tId !== id,
      );
    }

    // Emit an event to stop harvesting
    this._events.emit(Events.StopHarvest, id, sitekey);
  }

  // MARK: Task Callback Methods

  /**
   * Callback for Task Events
   *
   * This method is registered as a callback for all running tasks. The method
   * is used to merge all task events into a single stream, so only one
   * event handler is needed to consume all task events.
   *
   * @param {String} id the id of the task/monitor that emitted the event
   * @param {String} message the status message
   * @param {Task.Event} event the type of event that was emitted
   */
  mergeStatusUpdates(taskIds, message, event) {
    this._logger.silly('Tasks: %j posted new event %s - %j', taskIds, event, message);
    // For now only re emit Task Status Events
    if (event === TaskEvents.TaskStatus) {
      this._logger.silly('Reemitting this task update...');
      this._events.emit('status', taskIds, message, event);
    }

    if (event === TaskEvents.MonitorStatus) {
      this._logger.silly('Reemitting this monitor update...');
      this._events.emit('status', taskIds, message, event);
    }
  }

  changeDelay(delay, type) {
    this._logger.silly('Changing %s to: %s ms', type, delay);
    this._events.emit(Events.ChangeDelay, 'ALL', delay, type);
  }

  updateHook(hook, type) {
    this._logger.silly('Updating %s webhook to: %s', type, hook);
    this._events.emit(Events.UpdateHook, 'ALL', hook, type);
  }

  /**
   *
   * @param {string} type `discord` || `slack`
   */
  async testWebhook(hook, type) {
    this._logger.silly('Testing %s with url: %s', type, hook);
    const payload = [
      true,
      'SAFE',
      null,
      { name: 'Yeezy Boost 350 v2 – Static', url: 'https://example.com' },
      '$220.00',
      { name: 'Test Site', url: 'https://example.com' },
      { number: '#123123', url: 'https://example.com' },
      'Test Profile',
      'Random',
      'https://stockx-360.imgix.net/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Images/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Lv2/img01.jpg',
    ];
    if (type === HookTypes.discord) {
      const webhook = new ShopifyDiscord(hook).build(...payload);
      this.handleWebhook(webhook);
    } else if (type === HookTypes.slack) {
      const webhook = new ShopifySlack(hook).build(...payload);
      this.handleWebhook(webhook);
    }
  }

  /**
   * Start a task
   *
   * This method starts a given task if it has not already been started. The
   * requisite data is generated (id, open proxy if it is available, etc.) and
   * starts the task asynchronously.
   *
   * If the given task has already started, this method does nothing.
   * @param {Task} task
   * @param {object} options Options to customize the task:
   *   - type - The task type to start
   */
  async start(task, { type = TaskTypes.Normal }) {
    const proxy = await this._proxyManager.reserve(task.id, task.site.url, task.platform);

    this._logger.silly('Starting task for %s with proxy %j', task.id, proxy);
    return this._start([task, proxy, type]);
  }

  /**
   * Start multiple tasks
   *
   * This method is a convenience method to start multiple tasks
   * with a single call. The `start()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to start
   * @param {object} options Options to customize the task:
   *   - type - The task type to start
   */
  startAll(tasks, options) {
    Promise.all([...tasks].map(t => this.start(t, options)));
  }

  /**
   * Called after a task gets updated and needs to restart
   */
  async restart(task) {
    this._logger.silly('Restarting task %s', task.id);

    // TODO: Split monitor/task abort event calls up into separate events..
    const monitorId = Object.keys(this._monitors).find(k =>
      this._monitors[k].taskIds.some(id => id === task.id),
    );
    const id = Object.keys(this._tasks).find(k => this._tasks[k].id === task.id);
    const oldTask = this._tasks[id];
    // TODO: comparisons here.. we should only reset the monitor if the product data/site changes
    if (monitorId) {
      const monitor = this._monitors[monitorId];
      // otherwise, just patch in the new task data (as we don't need to set the new defaults)
      const parseType = getParseType(task.product, task.site, task.platform);
      monitor._context.task = task;
      oldTask._context.task = task;
      monitor._parseType = parseType;
      oldTask._parseType = parseType;
      if (monitor._delayer) {
        monitor._delayer.clear();
      }
    }
  }

  restartAll(tasks, options) {
    Promise.all([...tasks].map(t => this.restart(t, options)));
  }

  /**
   * Stop a task
   *
   * This method stops a given task if it is running. This is done by sending
   * an abort signal to force the task to stop and cleanup anything it needs
   * to.
   *
   * This method does nothing if the given task has already stopped or
   * if it was never started.
   *
   * @param {Task} task the task to stop
   */
  stop({ id }) {
    this._logger.silly('Attempting to stop task with id: %s', id);
    const task = this._tasks[id];

    if (!task) {
      this._logger.warn('This task was not previously running or has already been stopped!');
      return null;
    }

    task.stop();

    console.log(Object.values(this._monitors));
    const monitor = Object.values(this._monitors).find(m => m.context.hasId(id));
    this._logger.debug('Found monitor? %j', monitor || false);

    if (!monitor) {
      // Send abort signal
      this._logger.silly('Abort signal sent');
      this._events.emit(Events.Abort, id);
      this._logger.silly('Performing cleanup for task %s', id);
      return this._cleanup(task);
    }

    // Send abort signal
    this._logger.silly('Abort signal sent');
    this._events.emit(Events.Abort, id);
    this._logger.silly('Performing cleanup for task %s', id);
    return this._cleanup(task, monitor);
  }

  /**
   * Stop multiple tasks
   *
   * This method is a convenience method to stop multiple tasks
   * with a single call. The `stop()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to stop
   * @param {Map} options options associated with stopping tasks
   */
  stopAll(tasks, { force = false, wait = false }) {
    let tasksToStop = tasks;
    // if force option is set, force stop all running tasks
    if (force) {
      tasksToStop = Object.values(this._tasks).map(({ id }) => ({ id }));
      if (tasksToStop.length > 0) {
        this._logger.silly('Force Stopping %d tasks', tasksToStop.length, tasksToStop);
      }
    }
    return Promise.all([...tasksToStop].map(t => this.stop(t, { wait })));
  }

  /**
   * Check if a task is running
   *
   * @param {Task} task the task to check
   */
  isRunning(task) {
    return !!Object.values(this._tasks).find(t => t.id === task.id);
  }

  // MARK: Private Methods
  async _setup(task, monitor) {
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === task.id || id === 'ALL') {
        const args = [task.id, ...params];
        if (sideEffects) {
          // Call side effect before sending message
          sideEffects.apply(this, args);
        }
        // TODO: Respect the scope of the _events variable (issue #137)
        task._events.emit(event, ...args);
        if (monitor) {
          monitor._events.emit(event, ...args);
        }
      }
    };

    const handlers = {};
    const emissions =
      task.type === TaskTypes.ShippingRates
        ? [Events.Abort]
        : [
            Events.Abort,
            Events.Harvest,
            Events.SendProxy,
            Events.ChangeDelay,
            Events.UpdateHook,
            Events.ProductFound,
            Events.DeregisterProxy,
          ];

    // Generate Handlers for each event
    Promise.all(
      // eslint-disable-next-line array-callback-return
      emissions.map(event => {
        let handler;
        switch (event) {
          case Events.Abort: {
            // Abort handler has a special function so use that instead of default handler
            handler = id => {
              if (id === task.id || id === 'ALL') {
                // TODO: Respect the scope of the task's methods (issue #137)
                if (monitor && monitor.ids.some(i => i === id)) {
                  // TODO: Also remove the task id somehow in the handle abort
                  monitor._handleAbort(id);
                } else {
                  let found;
                  // eslint-disable-next-line no-restricted-syntax
                  for (const m of Object.values(this._monitors)) {
                    if (m.ids.some(i => i === id)) {
                      found = m;
                      break;
                    }
                  }

                  if (found) {
                    found._handleAbort(id);
                  }
                }

                task._handleAbort(task.id);
              }
            };
            break;
          }
          case Events.ProductFound: {
            handler = (id, product, parseType) => {
              task._handleProduct(id, product, parseType);
            };
            break;
          }
          case Events.DeregisterProxy: {
            handler = id => {
              task._handleDeregisterProxy(id);
              // if (monitor) {
              //   monitor._handleDeregisterProxy(id);
              // }
            };
            break;
          }
          case Events.Harvest: {
            // Harvest handler has a special function so use that instead of default handler
            handler = (id, token) => {
              if (id === task.id || id === 'ALL') {
                // TODO: Respect the scope of the task's methods (issue #137)
                task._handleHarvest(task.id, token);
              }
            };
            break;
          }
          case Events.SendProxy: {
            // Send proxy has a side effect so set it then generate the handler
            const sideEffects = (id, proxy) => {
              // Store proxy on worker so we can release it during cleanup
              this._tasks[id].proxy = proxy;
            };
            handler = handlerGenerator(TaskEvents.ReceiveProxy, sideEffects);
            break;
          }
          default: {
            handler = handlerGenerator(event, null);
            break;
          }
        }
        // Store handler for cleanup
        handlers[event] = handler;
        this._events.on(event, handler, this);
      }),
    );
    this._handlers[task.id] = handlers;

    if (task.type === TaskTypes.ShippingRates) {
      task.registerForEvent(TaskEvents.TaskStatus, this.mergeStatusUpdates);
      return;
    }
    if (monitor) {
      monitor.registerForEvent(TaskEvents.MonitorStatus, this.mergeStatusUpdates);
      monitor._events.on(Events.ProductFound, this.handleProduct, this);
      monitor._events.on(TaskEvents.SwapMonitorProxy, this.handleSwapProxy, this);
    }
    task.registerForEvent(TaskEvents.TaskStatus, this.mergeStatusUpdates);
    task._events.on(Events.Webhook, this.handleWebhook, this);
    task._events.on(Events.Success, this.handleSuccess, this);
    task._events.on(Events.StartHarvest, this.handleStartHarvest, this);
    task._events.on(Events.StopHarvest, this.handleStopHarvest, this);
    task._events.on(TaskTypes.SwapTaskProxy, this.handleSwapProxy, this);
  }

  async _cleanup(task, monitor) {
    const { id } = task;

    if (monitor) {
      const { ids } = monitor;
      this._logger.debug('Remaining monitor ids: %j', ids);

      if (!ids.length) {
        this._logger.debug('Freeing monitor!');
        monitor.deregisterForEvent(TaskEvents.MonitorStatus, this.mergeStatusUpdates);
        monitor._events.removeAllListeners();
        delete this._monitors[id];
      }
    }

    const handlers = this._handlers[id];
    delete this._handlers[id];
    // Cleanup manager handlers
    task.deregisterForEvent(TaskEvents.TaskStatus, this.mergeStatusUpdates);
    // TODO: Respect the scope of the _events variable (issue #137)
    task._events.removeAllListeners();

    // Cleanup task handlers
    const emissions =
      task.type === TaskTypes.ShippingRates
        ? [Events.Abort]
        : [
            Events.Abort,
            Events.ProductFound,
            Events.Harvest,
            Events.SendProxy,
            Events.ChangeDelay,
            Events.UpdateHook,
          ];
    await Promise.all(
      // eslint-disable-next-line array-callback-return
      emissions.map(event => {
        this._events.removeListener(event, handlers[event]);
      }),
    );

    const { proxy, site, platform } = this._tasks[id];
    delete this._tasks[id];

    if (proxy) {
      this._proxyManager.release(id, site, platform, proxy.id);
    }

    return task.id;
  }

  async _start([task, proxy, type]) {
    let newTask;
    let monitor;

    const { platform, id } = task;

    switch (platform) {
      case Platforms.Shopify: {
        if (type === TaskTypes.Normal) {
          const parseType = getParseType(task.product, null, platform);

          const context = new Context({
            id,
            task,
            parseType,
            proxy,
            message: '',
            events: new EventEmitter(),
            jar: new CookieJar(),
            logger: createLogger({
              dir: this._logPath,
              name: `Task-${id}`,
              prefix: `task-${id}`,
            }),
            discord: new ShopifyDiscord(task.discord),
            slack: new ShopifySlack(task.slack),
            captchaQueue: null,
            aborted: false,
          });

          newTask = new ShopifyTask(context);

          const found = Object.values(this._monitors).find(async m => {
            if (m.context.platform === platform) {
              // eslint-disable-next-line no-await-in-loop
              const isSameProduct = await TaskManager._compareProductInput(
                m._task.product,
                context.task.product,
                parseType,
              );

              this._logger.debug(
                'Same product data?: %j Same URL?: %j',
                isSameProduct,
                m._task.site.url === context.task.site.url,
              );

              if (isSameProduct && m._task.site.url === context.task.site.url) {
                return m;
              }
            }
            return null;
          });

          this._logger.debug('Existing monitor? %j', found || false);

          if (found) {
            this._logger.debug('Existing monitor found! Just adding id');
            found.context.ids.push(id);
          } else {
            monitor = new ShopifyMonitor(context);
          }
        } else if (type === TaskTypes.ShippingRates) {
          // TODO: THIS SHOULD BE LAUNCHED AS A WORKER_THREAD
          newTask = new RateFetcher(task, proxy, this._logPath);
        }
        break;
      }
      case Platforms.Supreme: {
        const context = new Context({
          id,
          task,
          parseType: ParseType.Keywords,
          proxy,
          message: '',
          events: new EventEmitter(),
          jar: new CookieJar(),
          logger: createLogger({
            dir: this._logPath,
            name: `Task-${id}`,
            prefix: `task-${id}`,
          }),
          discord: new SupremeDiscord(task.discord),
          slack: new SupremeSlack(task.slack),
          captchaQueue: null,
          aborted: false,
        });

        newTask = new SupremeTask(context);

        const found = Object.values(this._monitors).find(async m => {
          if (m.platform === platform) {
            // eslint-disable-next-line no-await-in-loop
            const isSameProduct = await TaskManager._compareProductInput(
              m._task.product,
              context.task.product,
              ParseType.Keywords,
            );

            this._logger.debug(
              'Same product?: %j Same category?: %j Same URL?: %j',
              isSameProduct,
              m._task.category === context.task.category,
              m._task.site.url === context.task.site.url,
            );

            if (
              isSameProduct &&
              m._task.category === context.task.category &&
              m._task.site.url === context.task.site.url
            ) {
              return m;
            }
          }
          return null;
        });

        this._logger.debug('Existing monitor? %j', found || false);

        if (found) {
          this._logger.debug('Existing monitor found! Just adding ids');
          found.context.ids.push(id);
        } else {
          this._logger.debug('No monitor found! Creating a new monitor');
          monitor = new SupremeMonitor(context);
        }
        break;
      }
      default:
        break;
    }

    // Return early if invalid task was created...
    if (!newTask) {
      return;
    }

    if (monitor) {
      this._monitors[id] = monitor;
    }
    this._tasks[id] = newTask;
    this._logger.silly('Wiring up Events ...');
    this._setup(newTask, monitor);

    // Start the task asynchronously
    this._logger.silly('Starting ...');
    try {
      if (monitor) {
        monitor.run();
      }
      newTask.run();
      this._logger.silly('Task %s started without errors', id);
    } catch (error) {
      this._logger.error('Task %s was unable to start due to an error: %s', id, error.toString());
    }
  }
}

TaskManager.Events = Events;
