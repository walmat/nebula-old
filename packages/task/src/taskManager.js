import EventEmitter from 'eventemitter3';

// Shared includes
import {
  Context,
  ProxyManager,
  WebhookManager,
  createLogger,
  registerForEvent,
  deregisterForEvent,
  compareProductData,
} from './common';
import { Platforms, Manager, Task, Monitor } from './common/constants';

// Shopify includes
import {
  Monitor as ShopifyMonitor,
  Task as ShopifyTask,
  RateFetcher,
  Discord as ShopifyDiscord,
  Slack as ShopifySlack,
  TaskTypes,
} from './shopify';
import { getParseType } from './shopify/utils/parse';

// Supreme includes
import {
  Monitor as SupremeMonitor,
  Task as SupremeTask,
  Discord as SupremeDiscord,
  Slack as SupremeSlack,
} from './supreme';

const { ParseType } = Monitor;
const { Events } = Manager;
const { Events: TaskEvents, HookTypes } = Task;

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

    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
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
    // since monitor/task pairs share the same context, we can just update the tasks' context here..
    return Promise.all(
      Object.values(this._tasks).map(t => {
        const task = t;
        task.context.task[type] = delay;

        const monitor = Object.values(this._monitors).find(m => m.context.hasId(task.context.id));
        if (monitor && monitor.delayer) {
          monitor.delayer.clear();
        }

        if (task.delayer) {
          task.delayer.clear();
        }
        return task;
      }),
    );
  }

  updateHook(hook, type) {
    this._logger.silly('Updating %s webhook to: %s', type, hook);
    // since monitor/task pairs share the same context, we can just update the tasks' context here..
    return Promise.all(
      Object.values(this._tasks).map(t => {
        const task = t;
        const { platform } = task;
        task.context.task[type] = hook;

        switch (platform) {
          case Platforms.Shopify: {
            if (type === HookTypes.discord) {
              const discord = hook ? new ShopifyDiscord(hook) : null;
              task.context.setDiscord(discord);
            } else if (type === HookTypes.slack) {
              const slack = hook ? new ShopifySlack(hook) : null;
              task.context.setSlack(slack);
            }
            break;
          }
          case Platforms.Supreme: {
            if (type === HookTypes.discord) {
              const discord = hook ? new SupremeDiscord(hook) : null;
              task.context.setDiscord(discord);
            } else if (type === HookTypes.slack) {
              const slack = hook ? new SupremeSlack(hook) : null;
              task.context.setSlack(slack);
            }
            break;
          }
          default:
            break;
        }
        return task;
      }),
    );
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

    const oldTask = this._tasks[task.id];

    if (!oldTask) {
      this._logger.warn('Task not found! Skipping restart..');
      return;
    }

    const monitor = Object.values(this._monitors).find(m => m.context.hasId(task.id));

    if (!monitor) {
      this._logger.warn('Task not found! Skipping restart..');
      return;
    }

    // patch into context...
    const parseType = getParseType(task.product, task.site, task.platform);
    monitor.context.task = task;
    oldTask.context.task = task;
    monitor.context.setParseType(parseType);
    oldTask.context.setParseType(parseType);
    if (monitor.delayer) {
      monitor.delayer.clear();
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
    this._logger.debug('Attempting to stop task with id: %s', id);
    const task = this._tasks[id];

    this._logger.info('Found task: %j', task || false);
    if (!task) {
      this._logger.warn('This task was not previously running or has already been stopped!');
      return null;
    }

    this._logger.info('Stopping task: %s', task.context.id);
    task.stop();

    const monitor = Object.values(this._monitors).find(m => m.context.hasId(id));
    this._logger.debug('Found monitor: %j', monitor || false);

    // this should never happen...
    if (!monitor) {
      this._logger.silly('Performing cleanup for task %s', id);
      return this._cleanup(task);
    }

    // Send abort signal
    this._logger.silly('Abort signal sent');
    monitor.stop(id);
    this._logger.silly('Performing cleanup for task and monitor %s', id);
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
      if (id === task.context.id || id === 'ALL') {
        const args = [task.context.id, ...params];
        if (sideEffects) {
          // Call side effect before sending message
          sideEffects.apply(this, args);
        }
        task.context.events.emit(event, ...args);
        if (monitor) {
          monitor.context.events.emit(event, ...args);
        }
      }
    };

    const handlers = {};
    const emissions = task.type === TaskTypes.ShippingRates ? [Events.Abort] : [Events.Harvest];

    // Generate Handlers for each event
    Promise.all(
      // eslint-disable-next-line array-callback-return
      emissions.map(event => {
        let handler;
        switch (event) {
          case Events.Harvest: {
            handler = (id, token) => {
              if (id === task.context.id || id === 'ALL') {
                task._handleHarvest(id, token);
              }
            };
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
    this._handlers[task.context.id] = handlers;

    // if it's just a rate fetcher task..
    if (task.type === TaskTypes.ShippingRates) {
      registerForEvent(TaskEvents.TaskStatus, task.context, this.mergeStatusUpdates);
      return;
    }

    if (monitor) {
      registerForEvent(TaskEvents.MonitorStatus, monitor.context, this.mergeStatusUpdates);
    }

    const { context: taskContext } = task;
    registerForEvent(TaskEvents.TaskStatus, task.context, this.mergeStatusUpdates);
    taskContext.events.on(Events.StartHarvest, this.handleStartHarvest, this);
    taskContext.events.on(Events.StopHarvest, this.handleStopHarvest, this);
  }

  async _cleanup(task, monitor) {
    const { context: taskContext } = task;

    if (monitor) {
      const { context: monitorContext } = monitor;
      this._logger.debug('Remaining monitor ids: %j', monitorContext.ids);

      if (!monitorContext.ids.length) {
        this._logger.debug('Freeing monitor!');
        deregisterForEvent(TaskEvents.MonitorStatus, task.context, this.mergeStatusUpdates);
        monitor.context.events.removeAllListeners();
        delete this._monitors[monitorContext.id];
      }
    }

    const handlers = this._handlers[taskContext.id];
    delete this._handlers[taskContext.id];
    // Cleanup manager handlers
    deregisterForEvent(TaskEvents.TaskStatus, task.context, this.mergeStatusUpdates);
    taskContext.events.removeAllListeners();

    // Cleanup task handlers
    const emissions = [Events.Harvest];
    await Promise.all(
      // eslint-disable-next-line array-callback-return
      emissions.map(event => {
        this._events.removeListener(event, handlers[event]);
      }),
    );

    const { context, platform } = this._tasks[taskContext.id];
    delete this._tasks[taskContext.id];

    if (context.proxy) {
      this._proxyManager.release(taskContext.id, context.task.site.url, platform, context.proxy.id);
    }

    return taskContext.id;
  }

  async _start([task, proxy, type]) {
    let newTask;
    let monitor;

    const { platform, id } = task;

    switch (platform) {
      case Platforms.Shopify: {
        const parseType = getParseType(task.product, null, platform);

        const context = new Context({
          id,
          task,
          type,
          parseType,
          proxy,
          logger: createLogger({
            dir: this._logPath,
            name: `Task-${id}`,
            prefix: `task-${id}`,
          }),
          discord: new ShopifyDiscord(task.discord),
          slack: new ShopifySlack(task.slack),
          proxyManager: this._proxyManager,
          webhookManager: this._webhookManager,
        });

        if (type === TaskTypes.Normal) {
          newTask = new ShopifyTask(context);

          const found = Object.values(this._monitors).find(async m => {
            if (m.platform === platform) {
              const { context: mContext } = m;
              const isSameProduct = await compareProductData(
                mContext.task.product,
                context.task.product,
                parseType,
              );

              this._logger.debug(
                'Same product data?: %j Same URL?: %j',
                isSameProduct,
                mContext.task.site.url === context.task.site.url,
              );

              if (isSameProduct && mContext.task.site.url === context.task.site.url) {
                return m;
              }
            }
            return null;
          });

          this._logger.debug('Existing monitor? %j', found || false);

          if (found) {
            this._logger.debug('Existing monitor found! Just adding id');
            found.context.addId(id);
            // patch the context as well..
            context.task.product = found.context.task.product;
          } else {
            monitor = new ShopifyMonitor(context);
          }
        } else if (type === TaskTypes.ShippingRates) {
          newTask = new RateFetcher(context);
        }
        break;
      }
      case Platforms.Supreme: {
        const context = new Context({
          id,
          task,
          parseType: ParseType.Keywords,
          proxy,
          logger: createLogger({
            dir: this._logPath,
            name: `Task-${id}`,
            prefix: `task-${id}`,
          }),
          discord: new SupremeDiscord(task.discord),
          slack: new SupremeSlack(task.slack),
          proxyManager: this._proxyManager,
          webhookManager: this._webhookManager,
        });

        newTask = new SupremeTask(context);

        const found = Object.values(this._monitors).find(async m => {
          if (m.platform === platform) {
            const { context: mContext } = m;
            const isSameProduct = await compareProductData(
              mContext.task.product,
              context.task.product,
              ParseType.Keywords,
            );

            this._logger.debug(
              'Same product?: %j Same category?: %j Same URL?: %j',
              isSameProduct,
              mContext.task.category === context.task.category,
              mContext.task.site.url === context.task.site.url,
            );

            if (
              isSameProduct &&
              mContext.task.category === context.task.category &&
              mContext.task.site.url === context.task.site.url
            ) {
              return m;
            }
          }
          return null;
        });

        this._logger.debug('Existing monitor? %j', found || false);

        if (found) {
          this._logger.debug('Existing monitor found! Just adding ids');
          found.context.addId(id);
          // patch in the context as well..
          context.task.product = found.context.task.product;
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

    this._logger.silly('Wiring up Events...');
    this._setup(newTask, monitor);

    // Start the task asynchronously
    this._logger.silly('Starting...');
    try {
      if (monitor) {
        this._logger.verbose('Monitor %s started without errors', id);
        monitor.run();
      }
      newTask.run();
      this._logger.verbose('Task %s started without errors', id);
    } catch (error) {
      this._logger.error('Task %s was unable to start due to an error: %s', id, error.toString());
    }
  }
}

TaskManager.Events = Events;
