const path = require('path');

const constants = require('./classes/utils/constants');
const TaskManager = require('./taskManager');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

class TaskThreadManager extends TaskManager {
  /**
   * Stop a Task
   *
   * Performs the super classes stop task operation (sending the abort signal),
   * but supports additional options specific to thread management:
   * - wait - if the wait option is passed, this method will wait for the
   *   worker thread to exit before finishing
   */
  async stop(task, options = {}) {
    const rId = super.stop(task, options);
    if (!rId) {
      return null;
    }

    if (options.wait) {
      const worker = this._runners[rId];
      await new Promise(resolve => {
        let forceKill;
        forceKill = setTimeout(() => {
          this._logger.debug(
            'Worker thread abort timeout reached for task: %s, terminating worker thread...',
            rId,
          );
          // clear out the timeout handler to we don't trigger the clearTimeout call
          forceKill = null;
          // Terminate the worker thread
          worker.terminate();
        }, 5000);
        const next = worker.onmessage;
        worker.onmessage = evt => {
          const { event } = evt.data;
          // make sure our message is an exit message
          if (event === 'exit') {
            this._logger.debug('Worker thread exited for task: %s', rId);
            if (forceKill) {
              clearTimeout(forceKill);
            }
            resolve();
          } else if (next) {
            // Run next message handler for this event
            next(evt);
          }
        };
      });
    }
    return rId;
  }

  /**
   * Stop multiple tasks
   *
   * Performs the super classes stop tasks operation,
   * but supports additional options specific to thread management
   * - force - if the force option is passed, this method sill stop all worker threads
   * - wait - if the wait options is passed, this method will wait for worker threads to close
   */
  async stopAll(tasks, options) {
    return Promise.all(super.stopAll(tasks, options));
  }

  _setup(worker) {
    this._logger.verbose('Setting up Worker Thread Handlers for runner: %s', worker.id);
    const handlers = {
      abort: id => {
        if (id === worker.id) {
          worker.postMessage({
            target: 'worker',
            event: 'abort',
            args: [id],
          });
        }
      },
      harvest: (id, token) => {
        if (id === worker.id) {
          worker.postMessage({
            target: 'worker',
            event: TaskManagerEvents.Harvest,
            args: [id, token],
          });
        }
      },
      proxy: (id, proxy) => {
        if (id === worker.id) {
          // eslint-disable-next-line no-param-reassign
          worker.proxy = proxy;
          worker.postMessage({
            target: 'worker',
            evetn: TaskRunnerEvents.ReceiveProxy,
            args: [id, proxy],
          });
        }
      },
      delay: (id, delay, type) => {
        if (id === worker.id) {
          worker.postMessage({
            target: 'worker',
            event: TaskManagerEvents.ChangeDelay,
            args: [id, delay, type],
          });
        }
      },
      updateHook: (id, hook, type) => {
        if (id === worker.id) {
          worker.postMessage({
            target: 'worker',
            event: TaskManagerEvents.UpdateHook,
            args: [id, hook, type],
          });
        }
      },
      onmessage: ({ data: { target, event, args } }) => {
        // Only handle events that target the main process
        if (target !== 'main') {
          return;
        }
        switch (event) {
          case TaskRunnerEvents.TaskStatus: {
            this.mergeStatusUpdates(...args);
            break;
          }
          case TaskManagerEvents.StartHarvest: {
            this.handleStartHarvest(...args);
            break;
          }
          case TaskManagerEvents.StopHarvest: {
            this.handleStopHarvest(...args);
            break;
          }
          case TaskRunnerEvents.SwapProxy: {
            this.handleSwapProxy(...args);
            break;
          }
          default: {
            break;
          }
        }
      },
    };

    // Attach handlers to manager events
    this._events.on('abort', handlers.abort);
    this._events.on(TaskManagerEvents.Harvest, handlers.harvest);
    this._events.on(TaskManagerEvents.SendProxy, handlers.proxy);
    this._events.on(TaskManagerEvents.ChangeDelay, handlers.delay);
    this._events.on(TaskManagerEvents.UpdateHook, handlers.updateHook);

    // Attach onmessage handler to worker
    // eslint-disable-next-line no-param-reassign
    worker.onmessage = handlers.onmessage;

    // Store handlers for cleanup
    this._handlers[worker.id] = handlers;
  }

  _cleanup(worker) {
    this._logger.verbose('Cleanup Worker Thread Handlers for runner: %s', worker.id);
    const { abort, harvest, proxy, delay, updateHook } = this._handlers[worker.id];
    delete this._handlers[worker.id];

    // Remove onmessage handler
    // eslint-disable-next-line no-param-reassign
    worker.onmessage = null;

    // Remove manager event handlers
    this._events.removeListener('abort', abort);
    this._events.removeListener(TaskManagerEvents.Harvest, harvest);
    this._events.removeListener(TaskManagerEvents.SendProxy, proxy);
    this._events.removeListener(TaskManagerEvents.ChangeDelay, delay);
    this._events.removeListener(TaskManagerEvents.UpdateHook, updateHook);
  }

  async _start([runnerId, task, openProxy]) {
    const { Worker } = global.window;
    this._logger.verbose('Spawning Worker Thread for runner: %s', runnerId);
    const worker = new Worker(path.resolve(__dirname, 'runnerWorker.js'));
    // Setup ids
    worker.id = runnerId;
    worker.taskId = task.id;
    worker.proxy = openProxy;
    this._runners[runnerId] = worker;

    // Perform Worker Thread Setup
    this._setup(worker);

    // Start the runner
    let doneHandler;
    try {
      worker.postMessage({
        target: 'worker',
        event: '__start',
        args: [runnerId, task, openProxy, this._loggerPath],
      });
      await new Promise((resolve, reject) => {
        const next = worker.onmessage;
        doneHandler = evt => {
          const { target, event, args, error } = evt.data;
          // Only handle events targeted for the main process
          if (target !== 'main') {
            return;
          }

          // Reject or resolve based on end status
          switch (event) {
            case '__error': {
              reject(error);
              break;
            }
            case '__done': {
              resolve(args);
              break;
            }
            default: {
              if (next) {
                next(evt);
              }
            }
          }
        };
        worker.onmessage = doneHandler;
      });
      this._logger.info('Runner %s finished without errors', runnerId);
    } catch (error) {
      this._logger.error('Runner %s was stopped due to error: %s', runnerId, error.message, error);
    }

    // Perform worker thread cleanup
    this._cleanup(worker);

    // Terminate the worker thread
    worker.terminate();
  }
}

module.exports = TaskThreadManager;
