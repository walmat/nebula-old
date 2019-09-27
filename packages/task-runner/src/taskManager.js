import EventEmitter from 'eventemitter3';
import shortid from 'shortid';
import { CookieJar } from 'tough-cookie';

// global includes
const ProxyManager = require('./common/proxyManager');
const WebhookManager = require('./common/webhookManager');
const { createLogger } = require('./common/logger');
const {
  Platforms,
  Manager: { Events },
  Runner: { Events: RunnerEvents },
} = require('./constants');

// shopify includes
const ShopifyRunner = require('./shopify/runners/taskRunner');
const ShopifyMonitor = require('./shopify/runners/monitor');
const RateFetcher = require('./shopify/runners/rateFetcher');
const { getParseType } = require('./shopify/classes/utils/parse');
const { HookTypes, Types: RunnerTypes } = require('./shopify/classes/utils/constants').TaskRunner;
const Discord = require('./shopify/classes/hooks/discord');
const Slack = require('./shopify/classes/hooks/slack');

// TODO: footsites includes

// supreme includes
const SupremeRunner = require('./supreme/runners/taskRunner');
const SupremeMonitor = require('./supreme/runners/monitor');

// TODO: mesh includes

class TaskManager {
  get loggerPath() {
    return this._loggerPath;
  }

  get proxyManager() {
    return this._proxyManager;
  }

  get webhookManager() {
    return this._webhookManager;
  }

  constructor(loggerPath) {
    // Event Emitter for this manager
    this._events = new EventEmitter();

    // Logger file path
    this._loggerPath = loggerPath;

    // Task Map
    this._runners = {};

    // Monitors Map
    this._monitors = {};

    // Handlers Map
    this._handlers = {};

    // Captcha Map
    this._captchaQueues = new Map();

    // Token Queue
    this._tokenReserveQueue = [];

    // Logger
    this._logger = createLogger({
      dir: this._loggerPath,
      name: 'TaskManager',
      prefix: 'manager',
    });

    this._proxyManager = new ProxyManager(this._logger);
    this._webhookManager = new WebhookManager(this._logger);

    this.productInterval = null;

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
   * Harvest a given captcha token for a given runner
   *
   * @param {String} runnerId the runner to update
   * @param {String} token the captcha token to harvest
   */
  harvestCaptchaToken(runnerId, token) {
    // Check if we have tokens to pass through
    if (this._tokenReserveQueue.length) {
      // Get the next runner to pass the token
      const rId = this._tokenReserveQueue.pop();
      // Use the runner id to get the container
      const container = this._captchaQueues.get(rId);
      if (!container) {
        // The current container no longer exists in the captcha queue,
        // Call recursively to get the next runner
        this.harvestCaptchaToken(rId, token);
      }
      // Send event to pass data to runner
      this._events.emit(Events.Harvest, rId, token);

      // Add the runner back into the token queue
      this._tokenReserveQueue.unshift(rId);
    }
  }

  /**
   * Handle Proxy Swapping Events from runner
   *
   * @param {String} runnerId
   * @param {Object} proxy
   */
  async handleSwapProxy(runnerId, proxy) {
    this._logger.debug('Swapping proxy: %j for task %s', proxy, runnerId);

    const proxyId = proxy ? proxy.id : null;
    const { site, platform } = this._runners[runnerId];
    const newProxy = await this._proxyManager.swap(runnerId, proxyId, site, platform);
    this._events.emit(Events.SendProxy, runnerId, newProxy);
  }

  async handleProduct(runnerId, product, parseType) {
    const interval = setInterval(() => {
      const runner = Object.values(this._runners).find(r => r.id === runnerId);

      if (!runner || (runner && runner._aborted)) {
        clearInterval(interval);
      }

      this._events.emit(Events.ProductFound, runnerId, product, parseType);
    }, 1000);
  }

  async handleWebhook(hooks = {}) {
    if (hooks instanceof Array) {
      await hooks.map(async hook => {
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
    Object.values(this._runners).forEach(r => {
      // if we are using the same profile, emit the abort event
      if (r.task.profile.id === task.profile.id) {
        console.log(r);
        this.stop(r.task);
      }
    });
  }

  /**
   * Start Harvesting Captcha
   *
   * Register and retrieve a captcha token for the given runner id. If
   * the captcha harvesting has not started for this runner, it will be
   * started.
   *
   * @param {String} runnerId the runner for which to register captcha events
   */
  handleStartHarvest(runnerId) {
    let container = this._captchaQueues.get(runnerId);
    if (!container) {
      // We haven't started harvesting for this runner yet, create a queue and start harvesting
      container = {};
      // Store the container on the captcha queue map
      this._captchaQueues.set(runnerId, container);

      // Add the runner to the token reserve queue
      this._tokenReserveQueue.unshift(runnerId);

      // Emit an event to start harvesting
      this._events.emit(Events.StartHarvest, runnerId);
    }
  }

  /**
   * Stop Harvesting Captchas
   *
   * Deregister this runner id from looking for captcha tokens and send an
   * event to stop harvesting captchas for this id.
   *
   * If the runner was not previously harvesting captchas, this method does
   * nothing.
   */
  handleStopHarvest(runnerId) {
    const container = this._captchaQueues.get(runnerId);

    // If this container was never started, there's no need to do anything further
    if (!container) {
      return;
    }

    // FYI this will reject all calls currently waiting for a token
    this._captchaQueues.delete(runnerId);

    // Emit an event to stop harvesting
    this._events.emit(Events.StopHarvest, runnerId);
  }
  // MARK: Task Runner Callback Methods

  /**
   * Callback for Task Runner Events
   *
   * This method is registered as a callback for all running tasks. The method
   * is used to merge all task runner events into a single stream, so only one
   * event handler is needed to consume all task runner events.
   *
   * @param {String} runnerId the id of the runner that emitted the event
   * @param {String} message the status message
   * @param {TaskRunner.Event} event the type of event that was emitted
   */
  mergeStatusUpdates(runnerId, message, event) {
    this._logger.silly('Runner %s posted new event %s - %j', runnerId, event, message);
    // For now only re emit Task Status Events
    if (event === RunnerEvents.TaskStatus) {
      this._logger.silly('Reemitting this task update...');
      const { taskId } = this._runners[runnerId];
      this._events.emit('status', taskId, message, event);
    }

    if (event === RunnerEvents.MonitorStatus) {
      this._logger.silly('Reemitting this monitor update...');
      const { taskId } = this._monitors[runnerId];
      this._events.emit('status', taskId, message, event);
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
      const webhook = new Discord(hook).build(...payload);
      this.handleWebhook(webhook);
    } else if (type === HookTypes.slack) {
      const webhook = new Slack(hook).build(...payload);
      this.handleWebhook(webhook);
    }
  }

  async setup(site, platform) {
    let runnerId;
    do {
      runnerId = shortid.generate();
    } while (this._runners[runnerId]);
    const openProxy = await this._proxyManager.reserve(runnerId, site, platform);
    return {
      runnerId,
      openProxy,
    };
  }

  cleanup(runnerId) {
    const { proxy, site, platform } = this._runners[runnerId];
    delete this._runners[runnerId];
    delete this._monitors[runnerId];
    if (proxy) {
      this._proxyManager.release(runnerId, site, platform, proxy.id);
    }
  }

  // MARK: Task Related Methods

  /**
   * Start a task
   *
   * This method starts a given task if it has not already been started. The
   * requisite data is generated (id, open proxy if it is available, etc.) and
   * starts the task runner asynchronously.
   *
   * If the given task has already started, this method does nothing.
   * @param {Task} task
   * @param {object} options Options to customize the runner:
   *   - type - The runner type to start
   */
  async start(task, { type = RunnerTypes.Normal }) {
    this._logger.silly('Starting task %s', task.id);

    const alreadyStarted = Object.values(this._runners).find(r => r.taskId === task.id);
    if (alreadyStarted) {
      this._logger.warn('This task is already running! skipping start');
      return;
    }
    const { runnerId, openProxy } = await this.setup(task.site.url, task.platform);
    this._logger.silly('Creating new runner %s for task %s', runnerId, task.id);

    this._start([runnerId, task, openProxy, type]).then(() => this.cleanup(runnerId));
  }

  /**
   * Start multiple tasks
   *
   * This method is a convenience method to start multiple tasks
   * with a single call. The `start()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to start
   * @param {object} options Options to customize the runner:
   *   - type - The runner type to start
   */
  startAll(tasks, options) {
    [...tasks].forEach(t => this.start(t, options));
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
  stop(task) {
    this._logger.silly('Attempting to stop runner with task id: %s', task.id);
    const rId = Object.keys(this._runners).find(k => this._runners[k].taskId === task.id);
    if (!rId) {
      this._logger.warn(
        'This task was not previously running or has already been stopped! Skipping stop',
      );
      return null;
    }

    // Send abort signal
    this._events.emit(Events.Abort, rId);
    this._logger.silly('Stop signal sent');
    return rId;
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
      tasksToStop = Object.values(this._runners).map(({ taskId: id }) => ({ id }));
      if (tasksToStop.length > 0) {
        this._logger.silly('Force Stopping %d tasks', tasksToStop.length, tasksToStop);
      }
    }
    return [...tasksToStop].map(t => this.stop(t, { wait }));
  }

  /**
   * Check if a task is running
   *
   * @param {Task} task the task to check
   */
  isRunning(task) {
    return !!Object.values(this._runners).find(r => r.task.id === task.id);
  }

  // MARK: Private Methods
  _setup(runner, monitor) {
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === runner.id || id === 'ALL') {
        const args = [runner.id, ...params];
        if (sideEffects) {
          // Call side effect before sending message
          sideEffects.apply(this, args);
        }
        // TODO: Respect the scope of the _events variable (issue #137)
        runner._events.emit(event, ...args);
        if (monitor) {
          monitor._events.emit(event, ...args);
        }
      }
    };

    const handlers = {};
    const emissions =
      runner.type === RunnerTypes.ShippingRates
        ? [Events.Abort]
        : [
            Events.Abort,
            Events.Harvest,
            Events.SendProxy,
            Events.ChangeDelay,
            Events.UpdateHook,
            Events.ProductFound,
          ];

    // Generate Handlers for each event
    emissions.forEach(event => {
      let handler;
      switch (event) {
        case Events.Abort: {
          // Abort handler has a special function so use that instead of default handler
          handler = id => {
            if (id === runner.id || id === 'ALL') {
              // TODO: Respect the scope of the runner's methods (issue #137)
              if (monitor) {
                monitor._handleAbort(runner.id);
              }
              runner._handleAbort(runner.id);
            }
          };
          break;
        }
        case Events.ProductFound: {
          handler = (id, product, parseType) => {
            runner._handleProduct(id, product, parseType);
            if (monitor) {
              monitor._handleProduct(id, product, parseType);
            }
          };
          break;
        }
        case Events.Harvest: {
          // Harvest handler has a special function so use that instead of default handler
          handler = (id, token) => {
            if (id === runner.id || id === 'ALL') {
              // TODO: Respect the scope of the runner's methods (issue #137)
              runner._handleHarvest(runner.id, token);
            }
          };
          break;
        }
        case Events.SendProxy: {
          // Send proxy has a side effect so set it then generate the handler
          const sideEffects = (id, proxy) => {
            // Store proxy on worker so we can release it during cleanup
            this._runners[id].proxy = proxy;
          };
          handler = handlerGenerator(RunnerEvents.ReceiveProxy, sideEffects);
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
    });
    this._handlers[runner.id] = handlers;

    if (runner.type === RunnerTypes.ShippingRates) {
      runner.registerForEvent(RunnerEvents.TaskStatus, this.mergeStatusUpdates);
      return;
    }
    if (monitor) {
      monitor.registerForEvent(RunnerEvents.MonitorStatus, this.mergeStatusUpdates);
      monitor._events.on(Events.ProductFound, this.handleProduct, this);
      monitor._events.on(RunnerEvents.SwapMonitorProxy, this.handleSwapProxy, this);
    }
    runner.registerForEvent(RunnerEvents.TaskStatus, this.mergeStatusUpdates);
    runner._events.on(Events.ProductFound, this.handleProduct, this);
    runner._events.on(Events.Webhook, this.handleWebhook, this);
    runner._events.on(Events.Success, this.handleSuccess, this);
    runner._events.on(Events.StartHarvest, this.handleStartHarvest, this);
    runner._events.on(Events.StopHarvest, this.handleStopHarvest, this);
    runner._events.on(RunnerEvents.SwapTaskProxy, this.handleSwapProxy, this);
  }

  _cleanup(runner, monitor) {
    const handlers = this._handlers[runner.id];
    delete this._handlers[runner.id];
    // Cleanup manager handlers
    runner.deregisterForEvent(RunnerEvents.TaskStatus, this.mergeStatusUpdates);
    if (monitor) {
      monitor.deregisterForEvent(RunnerEvents.MonitorStatus, this.mergeStatusUpdates);
      monitor._events.removeAllListeners();
    }
    // TODO: Respect the scope of the _events variable (issue #137)
    runner._events.removeAllListeners();

    // Cleanup runner handlers
    const emissions =
      runner.type === RunnerTypes.ShippingRates
        ? [Events.Abort]
        : [
            Events.Abort,
            Events.ProductFound,
            Events.Harvest,
            Events.SendProxy,
            Events.ChangeDelay,
            Events.UpdateHook,
          ];
    emissions.forEach(event => {
      this._events.removeListener(event, handlers[event]);
    });
  }

  async _start([runnerId, task, openProxy, type]) {
    let runner;
    let monitor;

    const { platform } = task;

    switch (platform) {
      case Platforms.Shopify: {
        if (type === RunnerTypes.Normal) {
          const parseType = getParseType(task.product, task.site, platform);

          // shared context between monitor/checkout
          const context = {
            id: runnerId,
            taskId: task.id,
            type: parseType,
            task,
            productFound: false,
            status: null,
            events: new EventEmitter(),
            jar: new CookieJar(),
            logger: createLogger({
              dir: this._loggerPath,
              name: `Task-${runnerId}`,
              prefix: `task-${runnerId}`,
            }),
            aborted: false,
          };

          runner = new ShopifyRunner(context, openProxy, parseType);
          runner.parseType = parseType;
          monitor = new ShopifyMonitor(context, openProxy, parseType);
          monitor.site = task.site.url;
          monitor.type = type;
        } else if (type === RunnerTypes.ShippingRates) {
          runner = new RateFetcher(runnerId, task, openProxy, this._loggerPath);
        }
        break;
      }
      case Platforms.Supreme: {
        const context = {
          id: runnerId,
          taskId: task.id,
          task,
          productFound: false,
          status: null,
          events: new EventEmitter(),
          jar: new CookieJar(),
          logger: createLogger({
            dir: this._loggerPath,
            name: `Task-${runnerId}`,
            prefix: `task-${runnerId}`,
          }),
          aborted: false,
        };

        runner = new SupremeRunner(context, openProxy);
        monitor = new SupremeMonitor(context, openProxy);
        break;
      }
      default:
        break;
    }

    // Return early if invalid platform was passed in
    if (!runner) {
      return;
    }

    runner.site = task.site.url;
    runner.task = task;
    runner.platform = platform;
    runner.type = type;
    this._monitors[runnerId] = monitor;
    this._runners[runnerId] = runner;
    this._logger.silly('Wiring up Events ...');
    this._setup(runner, monitor);

    // Start the runner asynchronously
    this._logger.silly('Starting ...');
    try {
      if (monitor) {
        await Promise.all([runner.start(), monitor.start()]);
      } else {
        await runner.start();
      }
      this._logger.silly('Runner %s finished without errors', runnerId);
    } catch (error) {
      this._logger.error(
        'Runner %s was stopped due to an error: %s',
        runnerId,
        error.toString(),
        error,
      );
    }

    this._logger.silly('Performing cleanup for runner %s', runnerId);
    this._cleanup(runner, monitor);
  }
}

TaskManager.Events = Events;

module.exports = TaskManager;
