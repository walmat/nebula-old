/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
const EventEmitter = require('eventemitter3');
const hash = require('object-hash');
const shortid = require('shortid');

const TaskRunner = require('../runners/taskRunner');
const ShippingRatesRunner = require('../runners/shippingRatesRunner');
const { Events } = require('../classes/utils/constants').TaskManager;
const { HookTypes, Types: RunnerTypes } = require('../classes/utils/constants').TaskRunner;
const Discord = require('../classes/hooks/discord');
const Slack = require('../classes/hooks/slack');
const { createLogger } = require('../../common/logger');

class TaskManager {
  get loggerPath() {
    return this._loggerPath;
  }

  constructor(loggerPath) {
    // Event Emitter for this manager
    this._events = new EventEmitter();

    // Logger file path
    this._loggerPath = loggerPath;

    // Runner Map
    this._runners = {};

    // Handlers Map
    this._handlers = {};

    // Captcha Map
    this._captchaQueues = new Map();

    // Token Queue
    this._tokenReserveQueue = [];

    // Proxy Map
    this._proxies = new Map();

    // Logger
    this._logger = createLogger({
      dir: this._loggerPath,
      name: 'TaskManager',
      prefix: 'manager',
    });

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

  // MARK: Proxy Related Methods

  /**
   * Register a Proxy
   *
   * This method adds a given proxy to the availability proxy pool if it has
   * not been added already. Once added, task runners are able to reserve
   * the given proxy.
   *
   * @param {Proxy} proxy the proxy to register
   */
  registerProxy(proxy) {
    this._logger.verbose('Registering proxy...');
    let proxyId;
    const proxyHash = hash(proxy);
    for (const val of this._proxies.values()) {
      if (val.hash.includes(proxyHash)) {
        this._logger.verbose('Proxy already exists with hash %s! proxy not added', proxyHash);
        return;
      }
    }
    this._logger.verbose('New Proxy Detected with hash %s. Adding now', proxyHash);
    do {
      proxyId = shortid.generate();
    } while (this._proxies.get(proxyId));

    this._proxies.set(proxyId, {
      id: proxyId,
      hash: proxyHash,
      proxy,
      banList: {},
      useList: {},
      assignedRunners: [],
    });
    this._logger.verbose('Proxy Added with id %s', proxyId);
  }

  /**
   * Register Multiple Proxies
   *
   * This is a convenience method to handle registering multiple proxies with
   * a single call.
   *
   * @param {List<Proxy>} proxies list of proxies to register
   */
  registerProxies(proxies) {
    proxies.forEach(p => this.registerProxy(p));
  }

  /**
   * Deregister a Proxy
   *
   * This method removes a given proxy from the availability pool, but does
   * not stop the proxy from being used if already in use. A task runner
   * that has reserved this proxy will continue to use it until the task
   * stops or until the task runner attempts to swap the proxy.
   *
   * @param {Proxy} proxy the proxy to deregister
   */
  deregisterProxy(proxy) {
    this._logger.verbose('Deregistering proxy...');
    const proxyHash = hash(proxy);
    let storedProxy = null;
    for (const val of this._proxies.values()) {
      if (val.hash === proxyHash) {
        storedProxy = val;
        break;
      }
    }

    if (!storedProxy) {
      this._logger.verbose('Proxy with hash %s not found! Skipping removal', proxyHash);
      return;
    }
    this._logger.verbose('Proxy found with hash %s. Removing now', proxyHash);
    this._proxies.delete(storedProxy.id);
    this._logger.verbose('Proxy removed with id %s', storedProxy.id);
  }

  /**
   * Deregister Multiple Proxies
   *
   * This is a convenience method to handle deregistering multiple proxies with
   * a single call.
   *
   * @param {List<Proxy>} proxies list of proxies to deregister
   */
  deregisterProxies(proxies) {
    proxies.forEach(p => this.deregisterProxy(p));
  }

  /**
   * Reserve a proxy
   *
   * @param {String} runnerId the id of the runner for whom the proxy will be reserved
   * @param {String} waitForOpenProxy whether or not this method should wait for an open proxy
   * @param {Number} waitLimit the recursive call limit on proxy reservations
   */
  async reserveProxy(runnerId, site, waitForOpenProxy = false, waitLimit = 5) {
    if (!waitLimit || Number.isNaN(waitLimit) || waitLimit < 0) {
      // Force wait limit to be 0 if we have an invalid parameter value passed in
      waitLimit = 0;
    }
    this._logger.verbose(
      'Reserving proxy for runner %s ... Looking through %d proxies',
      runnerId,
      this._proxies.size,
    );
    let proxy = null;
    for (const val of this._proxies.values()) {
      if (
        !val.assignedRunners.find(id => id === runnerId) &&
        !val.useList[site.url] &&
        !val.banList[site.url]
      ) {
        proxy = val;
        break;
      }
    }
    if (proxy) {
      proxy.assignedRunners.push(runnerId);
      proxy.useList[site.url] = true;
      this._proxies.delete(proxy.id);
      this._proxies.set(proxy.id, proxy);
      this._logger.verbose('Returning proxy: %s', proxy.id);
      return proxy;
    }
    if (!waitForOpenProxy || waitLimit === 0) {
      this._logger.verbose('Not waiting for open proxy, returning null');
      return null;
    }
    this._logger.verbose('All proxies are reserved, waiting for open proxy...');
    return new Promise(resolve => {
      setTimeout(
        () => resolve(this.reserveProxy(runnerId, site, waitForOpenProxy, waitLimit - 1)),
        1000,
      ); // wait for 1 sec, then try again // TODO should we change this timeout to something smaller?
    });
  }

  /**
   * Release a proxy
   *
   * @param {String} runnerId the id of the runner this proxy is being released from
   * @param {String} proxyId the id of the proxy to release
   */
  releaseProxy(runnerId, site, proxyId) {
    this._logger.verbose('Releasing proxy %s for runner %s ...', proxyId, runnerId);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.verbose('No proxy found, skipping release');
      return;
    }
    proxy.assignedRunners = proxy.assignedRunners.filter(rId => rId !== runnerId);
    delete proxy.useList[site];
    this._logger.verbose('Released Proxy %s', proxyId);
  }

  /**
   * Ban a proxy
   *
   * @param {String} runnerId the id of the runner
   * @param {String} proxyId the id of the proxy to ban
   */
  banProxy(runnerId, site, proxyId) {
    this._logger.verbose('Banning proxy %s for runner %s ...', proxyId, runnerId);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.verbose('No proxy found, skipping ban');
      return;
    }
    proxy.banList[site] = true;
    setTimeout(() => delete proxy.banList[site], 30000);
    this._logger.verbose('Banned Proxy %s', proxyId);
  }

  /**
   * Swap a proxy for a runner
   *
   * This method swaps a proxy for a given runner. If the proxy needs to
   * banned, that is done as well. A fresh proxy is returned for further
   * use.
   *
   * @param {String} runnerId the runner who needs the proxy
   * @param {String} proxyId the old proxy to release
   * @param {String} site the site the proxy is banned
   * @param {bool} shouldBan whether the old proxy should be banned
   */
  async swapProxy(runnerId, proxyId, site, shouldBan) {
    this._logger.verbose(
      'Swapping Proxy %s for runner %s on site %s. Should ban? %s ...',
      proxyId,
      runnerId,
      site,
      shouldBan,
    );
    let shouldRelease = true;
    if (!this._proxies.get(proxyId)) {
      this._logger.verbose('No proxy found, skipping release/ban');
      shouldRelease = false;
    }

    // Attempt to reserve a proxy first before releasing the old one
    const newProxy = await this.reserveProxy(runnerId, site);
    if (!newProxy) {
      this._logger.verbose('No new proxy available, skipping release/ban');
      return null;
    }

    // Check if we need to release the old proxy
    if (shouldRelease) {
      // Check if we need to ban the old proxy
      if (shouldBan) {
        this.banProxy(runnerId, site, proxyId);
      }
      this.releaseProxy(runnerId, site, proxyId);
    }
    this._logger.verbose('New proxy: %j', newProxy);
    // Return the new reserved proxy
    return newProxy;
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
   * @param {Bool} shouldBan
   */
  async handleSwapProxy(runnerId, proxy, shouldBan) {
    const proxyId = proxy ? proxy.id : null;
    const { site } = this._runners[runnerId];
    const newProxy = await this.swapProxy(runnerId, proxyId, site, shouldBan);
    this._events.emit(Events.SendProxy, runnerId, newProxy);
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
    this._logger.info('Runner %s posted new event %s - %s', runnerId, event, message.message);
    // For now only re emit Task Status Events
    if (event === TaskRunner.Events.TaskStatus) {
      this._logger.info('Reemitting this status update...');
      const { taskId } = this._runners[runnerId];
      this._events.emit('status', taskId, message, event);
    }
  }

  changeDelay(delay, type) {
    this._logger.info('Changing %s to: %s ms', type, delay);
    this._events.emit(Events.ChangeDelay, 'ALL', delay, type);
  }

  updateHook(hook, type) {
    this._logger.info('Updating %s webhook to: %s', type, hook);
    this._events.emit(Events.UpdateHook, 'ALL', hook, type);
  }

  /**
   *
   * @param {string} type `discord` || `slack`
   */
  async testWebhook(hook, type) {
    this._logger.info('Testing %s with url: %s', type, hook);
    const payload = [
      true,
      { name: 'Yeezy Boost 350 v2 – Static', url: 'https://example.com' },
      '150.00',
      { name: 'Test Site', url: 'https://example.com' },
      { number: '123123', url: 'https://example.com' },
      'Test Profile',
      ['Random'],
      '900',
      'shopify-Free%20Shipping-0.00',
      'None',
      'https://stockx-360.imgix.net/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Images/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Lv2/img01.jpg',
    ];
    if (type === HookTypes.discord) {
      await new Discord(hook).build(...payload);
    } else if (type === HookTypes.slack) {
      await new Slack(hook).build(...payload);
    }
  }

  async setup(site) {
    let runnerId;
    do {
      runnerId = shortid.generate();
    } while (this._runners[runnerId]);
    const openProxy = await this.reserveProxy(runnerId, site);
    return {
      runnerId,
      openProxy,
    };
  }

  cleanup(runnerId) {
    const { proxy } = this._runners[runnerId];
    delete this._runners[runnerId];
    if (proxy) {
      this.releaseProxy(runnerId, proxy.id);
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
    this._logger.info('Starting task %s', task.id);

    const alreadyStarted = Object.values(this._runners).find(r => r.taskId === task.id);
    if (alreadyStarted) {
      this._logger.warn('This task is already running! skipping start');
      return;
    }
    const { runnerId, openProxy } = await this.setup(task.site);
    this._logger.info('Creating new runner %s for task %s', runnerId, task.id);

    this._start([runnerId, task, openProxy, type]).then(() => {
      this.cleanup(runnerId);
    });
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
    this._logger.info('Attempting to stop runner with task id: %s', task.id);
    const rId = Object.keys(this._runners).find(k => this._runners[k].taskId === task.id);
    if (!rId) {
      this._logger.warn(
        'This task was not previously running or has already been stopped! Skipping stop',
      );
      return null;
    }

    // Send abort signal
    this._events.emit(Events.Abort, rId);
    this._logger.verbose('Stop signal sent');
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
        this._logger.info('Force Stopping %d tasks', tasksToStop.length, tasksToStop);
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
    return !!this._runners.find(r => r.task.id === task.id);
  }

  // MARK: Private Methods
  _setup(runner) {
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === runner.id || id === 'ALL') {
        const args = [runner.id, ...params];
        if (sideEffects) {
          // Call side effect before sending message
          sideEffects.apply(this, args);
        }
        // TODO: Respect the scope of the _events variable (issue #137)
        runner._events.emit(event, ...args);
      }
    };

    const handlers = {};

    // Generate Handlers for each event
    [Events.Abort, Events.Harvest, Events.SendProxy, Events.ChangeDelay, Events.UpdateHook].forEach(
      event => {
        let handler;
        switch (event) {
          case Events.Abort: {
            // Abort handler has a special function so use that instead of default handler
            handler = id => {
              if (id === runner.id || id === 'ALL') {
                // TODO: Respect the scope of the runner's methods (issue #137)
                runner._handleAbort(runner.id);
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
            handler = handlerGenerator(TaskRunner.Events.ReceiveProxy, sideEffects);
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
      },
    );
    this._handlers[runner.id] = handlers;

    // Attach Manager Handlers to Runner Events
    // TODO: Respect the scope of the _events variable (issue #137)
    // Register for status updates
    runner.registerForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
    runner._events.on(Events.StartHarvest, this.handleStartHarvest, this);
    runner._events.on(Events.StopHarvest, this.handleStopHarvest, this);
    runner._events.on(TaskRunner.Events.SwapProxy, this.handleSwapProxy, this);
  }

  _cleanup(runner) {
    const handlers = this._handlers[runner.id];
    delete this._handlers[runner.id];
    // Cleanup manager handlers
    runner.deregisterForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
    // TODO: Respect the scope of the _events variable (issue #137)
    runner._events.removeAllListeners();

    // Cleanup runner handlers
    [Events.Abort, Events.Harvest, Events.SendProxy, Events.ChangeDelay, Events.UpdateHook].forEach(
      event => {
        this._events.removeListener(event, handlers[event]);
      },
    );
  }

  async _start([runnerId, task, openProxy, type]) {
    let runner;
    if (type === RunnerTypes.Normal) {
      runner = new TaskRunner(runnerId, task, openProxy, this._loggerPath);
    } else if (type === RunnerTypes.ShippingRates) {
      runner = new ShippingRatesRunner(runnerId, task, openProxy, this._loggerPath);
    }
    // Return early if invalid type was passed in
    if (!runner) {
      return;
    }
    runner.site = task.site.url;
    this._runners[runnerId] = runner;

    this._logger.verbose('Wiring up TaskRunner Events ...');
    this._setup(runner);

    // Start the runner asynchronously
    this._logger.verbose('Starting Runner ...');
    try {
      await runner.start();
      this._logger.info('Runner %s finished without errors', runnerId);
    } catch (error) {
      this._logger.error(
        'Runner %s was stopped due to an error: %s',
        runnerId,
        error.toString(),
        error,
      );
    }

    this._logger.verbose('Performing cleanup for runner %s', runnerId);
    this._cleanup(runner);
  }
}

TaskManager.Events = Events;

module.exports = TaskManager;
