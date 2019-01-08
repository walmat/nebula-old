/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
const EventEmitter = require('events');
const hash = require('object-hash');
const shortid = require('shortid');

const TaskRunner = require('./taskRunner');
const { Events } = require('./classes/utils/constants').TaskManager;
const { createLogger } = require('../common/logger');

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
    this._proxies = {};

    // Logger
    this._logger = createLogger({
      dir: this._loggerPath,
      name: 'TaskManager',
      filename: 'manager.log',
    });

    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
    this.handleStartHarvest = this.handleStartHarvest.bind(this);
    this.handleStopHarvest = this.handleStopHarvest.bind(this);
    this.handleSwapProxy = this.handleSwapProxy.bind(this);
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
    if (
      Object.keys(this._proxies)
        .map(key => this._proxies[key].hash)
        .includes(proxyHash)
    ) {
      this._logger.verbose('Proxy already exists with hash %s! proxy not added', proxyHash);
      return;
    }
    this._logger.verbose('New Proxy Detected with hash %s. Adding now', proxyHash);
    do {
      proxyId = shortid.generate();
    } while (this._proxies[proxyId]);

    this._proxies[proxyId] = {
      id: proxyId,
      hash: proxyHash,
      proxy,
    };
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
    const storedProxy = Object.values(this._proxies).find(p => p.hash === proxyHash);

    if (!storedProxy) {
      this._logger.verbose('Proxy with hash %s not found! Skipping removal', proxyHash);
      return;
    }
    this._logger.verbose('Proxy found with hash %s. Removing now', proxyHash);

    delete this._proxies[storedProxy.id];
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
   * TODO - doesn't send to child process correctly
   */
  changeMonitorDelay(delay) {
    console.log('changing monitor delay to: ', delay);
    this._events.emit(Events.SendMonitorDelay, delay);
  }

  /**
   * TODO - doesn't send to child process correctly
   */
  changeErrorDelay(delay) {
    console.log('changing error delay to: ', delay);
    this._events.emit(Events.SendErrorDelay, delay);
  }

  /**
   * Reserve a proxy
   *
   * @param {String} runnerId the id of the runner for whom the proxy will be reserved
   * @param {String} waitForOpenProxy whether or not this method should wait for an open proxy
   */
  async reserveProxy(runnerId, waitForOpenProxy) {
    this._logger.verbose('Reserving proxy for runner %s ...', runnerId);
    const proxy = Object.values(this._proxies).find(p => !p.assignedRunner && !p.banned);
    if (proxy) {
      proxy.assignedRunner = runnerId;
      this._logger.verbose('Returning proxy: %s', proxy.id);
      return proxy;
    }
    if (!waitForOpenProxy) {
      this._logger.verbose('Not waiting for open proxy, returning null');
      return null;
    }
    this._logger.verbose('All proxies are reserved, waiting for open proxy...');
    return new Promise(resolve => {
      setTimeout(() => resolve(this.reserveProxy(runnerId, waitForOpenProxy)), 1000); // wait for 1 sec, then try again // TODO should we change this timeout to something smaller?
    });
  }

  /**
   * Release a proxy
   *
   * @param {String} runnerId the id of the runner this proxy is being released from
   * @param {String} proxyId the id of the proxy to release
   */
  releaseProxy(runnerId, proxyId) {
    this._logger.verbose('Releasing proxy %s for runner %s ...', proxyId, runnerId);
    const proxy = this._proxies[proxyId];
    if (!proxy) {
      this._logger.verbose('No proxy found, skipping release');
      return;
    }
    delete proxy.assignedRunner;
    this._logger.verbose('Released Proxy %s', proxyId);
  }

  /**
   * Ban a proxy
   *
   * @param {String} runnerId the id of the runner
   * @param {String} proxyId the id of the proxy to ban
   */
  banProxy(runnerId, proxyId) {
    this._logger.verbose('Banning proxy %s for runner %s ...', proxyId, runnerId);
    const proxy = this._proxies[proxyId];
    if (!proxy) {
      this._logger.verbose('No proxy found, skipping ban');
      return;
    }
    proxy.banned = true;
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
   * @param {bool} shouldBan whether the old proxy should be banned
   */
  async swapProxy(runnerId, proxyId, shouldBan) {
    this._logger.verbose(
      'Swapping Proxy %s for runner %s. Should ban? %s ...',
      proxyId,
      runnerId,
      shouldBan,
    );
    let shouldRelease = true;
    if (!this._proxies[proxyId]) {
      this._logger.verbose('No proxy found, skipping release/ban');
      shouldRelease = false;
    }

    // Check if we need to release the old proxy
    if (shouldRelease) {
      // Check if we need to ban the old proxy
      if (shouldBan) {
        this.banProxy(runnerId, proxyId);
      }
      this.releaseProxy(runnerId, proxyId);
    }
    // Return the new reserved proxy
    return this.reserveProxy(runnerId);
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
    const newProxy = await this.swapProxy(runnerId, proxy.id, shouldBan);
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

  async setup() {
    let runnerId;
    do {
      runnerId = shortid.generate();
    } while (this._runners[runnerId]);
    const openProxy = await this.reserveProxy(runnerId);
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
   */
  async start(task) {
    this._logger.info('Starting task %s', task.id);

    const alreadyStarted = Object.values(this._runners).find(r => r.taskId === task.id);
    if (alreadyStarted) {
      this._logger.warn('This task is already running! skipping start');
      return;
    }
    const { runnerId, openProxy } = await this.setup();
    this._logger.info('Creating new runner %s for task %s', runnerId, task.id);

    this._start([runnerId, task, openProxy]).then(() => {
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
   */
  startAll(tasks) {
    [...tasks].forEach(t => this.start(t));
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
      return;
    }

    // Send abort signal
    this._events.emit('abort', rId);
    this._logger.verbose('Stop signal sent');
  }

  /**
   * Stop multiple tasks
   *
   * This method is a convenience method to stop multiple tasks
   * with a single call. The `stop()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to stop
   */
  stopAll(tasks) {
    [...tasks].forEach(t => this.stop(t));
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
    const handlers = {
      abort: id => {
        if (id === runner.id) {
          // TODO: Respect the scope of the runner's methods (issue #137)
          runner._handleAbort(id);
        }
      },
      harvest: (id, token) => {
        if (id === runner.id) {
          // TODO: Respect the scope of the _events variable (issue #137)
          runner._events.emit(Events.Harvest, id, token);
        }
      },
      proxy: (id, proxy) => {
        if (id === runner.id) {
          // TODO: Respect the scope of the _events variable (issue #137)
          runner._events.emit(TaskRunner.Events.ReceiveProxy, id, proxy);
        }
      },
    };
    this._handlers[runner.id] = handlers;

    // Attach Runner Handlers to Manager Events
    this._events.on('abort', handlers.abort);
    this._events.on(Events.Harvest, handlers.harvest);
    this._events.on(Events.SendProxy, handlers.proxy);

    // Attach Manager Handlers to Runner Events
    // TODO: Respect the scope of the _events variable (issue #137)
    // Register for status updates
    runner.registerForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
    runner._events.on(Events.StartHarvest, this.handleStartHarvest);
    runner._events.on(Events.StopHarvest, this.handleStopHarvest);
    runner._events.on(TaskRunner.Events.SwapProxy, this.handleSwapProxy);
  }

  _cleanup(runner) {
    const { abort, harvest, proxy } = this._handlers[runner.id];
    delete this._handlers[runner.id];
    // Cleanup manager handlers
    runner.deregisterForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
    // TODO: Respect the scope of the _events variable (issue #137)
    runner._events.removeListener(Events.StartHarvest, this.handleStartHarvest);
    runner._events.removeListener(Events.StopHarvest, this.handleStopHarvest);

    // Cleanup runner handlers
    this._events.removeListener('abort', abort);
    this._events.removeListener(Events.Harvest, harvest);
    this._events.removeListener(Events.SendProxy, proxy);
  }

  async _start([runnerId, task, openProxy]) {
    const runner = new TaskRunner(runnerId, task, openProxy, this._loggerPath);
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
