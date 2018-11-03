const uuidv4 = require('uuid/v4');
const hash = require('object-hash');
const EventEmitter = require('events');
const TaskRunner = require('./taskRunner');

class TaskManager {
  constructor() {
    // Event Emitter for this manager
    this._events = new EventEmitter();

    // Runner Map
    this._runners = [];

    // Proxy Map
    this._proxies = [];

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
    console.log('[TRACE]: TaskManager: registering proxy...');
    let proxyId;
    const proxyHash = hash(proxy);
    if (Object.keys(this._proxies)
        .map(key => this._proxies[key].hash)
        .includes(proxyHash)) {
      console.log(`[TRACE]: TaskManager: proxy already exists with hash ${proxyHash}! Proxy not added`);
      return;
    }
    console.log(`[TRACE]: TaskManager: New Proxy Detected with hash ${proxyHash}. Adding now`);
    do {
      proxyId = uuidv4();
    } while(this._proxies[proxyId]);

    this._proxies[proxyId] = {
      id: proxyId,
      hash: proxyHash,
      proxy,
    };
    console.log(`[TRACE]: TaskManager: Proxy Added with id ${proxyId}`);
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
    console.log('[TRACE]: TaskManager: deregistering proxy...');
    const proxyHash = hash(proxy);
    const storedProxy = this._proxies.find(p => p.hash === proxyHash);

    if (!storedProxy) {
      console.log(`[TRACE]: TaskManager: proxy with hash ${proxyHash} not found! Skipping removal`);
      return;
    }
    console.log(`[TRACE]: TaskManager: Proxy found with hash ${proxyHash}. Removing now`);
    
    delete this._proxies[storedProxy.id];
    console.log(`[TRACE]: TaskManager: Proxy removed with id ${storedProxy.id}`);
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
   */
  async reserveProxy(runnerId, waitForOpenProxy) {
    console.log(`[TRACE]: TaskManager: Reserving proxy for runner ${runnerId} ...`);
    const proxy = this._proxies.find(p => !p.assignedRunner && !p.banned)
    if (proxy) {
      proxy.assignedRunner = runnerId;
    }
    if (!waitForOpenProxy) {
      console.log('[TRACE]: returning proxy or null');
      return proxy;
    }
    console.log('[TRACE]: TaskManager: Returning proxy or promise to recursive reserve')
    return proxy || new Promise((resolve) => {
      console.log('[TRACE]: TaskManager: All Proxies are Reserved, ')
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
    console.log(`[TRACE]: TaskManager: Releasing proxy ${proxyId} for runner ${runnerId} ...`);
    const proxy = this._proxies[proxyId];
    if (!proxy) {
      console.log('[TRACE]: TaskManager: No proxy found, skipping release');
      return;
    }
    delete proxy.assignedRunner;
    console.log('[TRACE]: TaskManager: Released Proxy');
  }

  /**
   * Ban a proxy
   * 
   * @param {String} proxyId the id of the proxy to ban
   */
  banProxy(proxyId) {
    console.log(`[TRACE]: TaskManager: Banning proxy ${proxyId} for runner ${runnerId} ...`);
    const proxy = this._proxies[proxyId];
    if (!proxy) {
      console.log('[TRACE]: TaskManager: No proxy found, skipping ban');
      return;
    }
    proxy.banned = true;
    console.log('[TRACE]: TaskManager: banned Proxy');
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
    console.log(`[TRACE]: TaskManager: Swapping Proxy ${proxyId} for runner ${runnerId}. Should Ban? ${shouldBan} ...`);
    let shouldRelease = true;
    if (!this._proxies[proxyId]) {
      console.log('[TRACE]: TaskManager: No proxy found, skipping release/ban');
      shouldRelease = false;
    }

    // Check if we need to release the old proxy
    if (shouldRelease) {
      // Check if we need to ban the old proxy
      if (shouldBan) {
        this.banProxy(proxyId);
      }
      this.releaseProxy(runnerId, proxyId);
    }
    // Return the new reserved proxy
    return await this.reserveProxy(runnerId);
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
    console.log(`[TRACE]: TaskManager: Runner ${runnerId} posted new event ${event} - ${message.message}`);
    // For now only re emit Task Status Events
    if (event === TaskRunner.Events.TaskStatus) {
      console.log('[TRACE]: TaskManager: Reemitting this status update...');
      const taskId = this._runners[runnerId]._context.task.id;
      this._events.emit('status', taskId, message, event);
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
    console.log(`[TRACE]: TaskManager: Starting task ${task.id} ...`);

    const alreadyStarted = this._runners.find(r => r.task.id === task.id);
    if(alreadyStarted) {
      console.log('[TRACE]: TaskManager: This task is already runner! skipping start');
      return;
    }

    let runnerId;
    do {
      runnerId = uuidv4();
    } while(this._runners[runnerId]);

    const openProxy = await this.reserveProxy(runnerId);
    const runner = new TaskRunner(runnerId, task, openProxy, this);
    this._runners[runnerId] = runner;

    // Register for status updates
    runner.registerForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
    
    // Start the runner asynchronously
    runner.start()
    .then(() => {
      console.log('success')
      // Replace this with any success specific callback you want
    }) 
    .catch(() => {
      console.log('error')
      // Replace this with any error specific callback you want
    }) 
    .then(() => {
      console.log(`[TRACE]: Runner ${runnerId} has finished or was stopped`);
      // Cleanup handlers
      runner.deregisterForEvent(TaskRunner.Events.TaskStatus, this.mergeStatusUpdates);
      // Remove from runners map
      delete this._runners[runnerId];
      // Release proxy
      if (openProxy) {
        this.releaseProxy(runnerId, openProxy.id);
      }
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
    tasks.forEach(t => this.start(t));
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
    const runner = this._runners.find(r => r.task.id === task.id);
    if (!runner) {
      console.log('[TRACE]: TaskManager: This task was not previously runner or has already been stopped! Skipping stop');
      return;
    }

    // Send abort signal
    this._events.emit('abort', runner.id);
    console.log('[TRACE]: TaskManager: Stop signal sent');
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
    tasks.forEach(t => this.stop(t));
  }

  /**
   * Check if a task is running
   * 
   * @param {Task} task the task to check
   */
  isRunning(task) {
    return !!(this._runners.find(r => r.task.id === task.id));
  }
}

module.exports = TaskManager;
