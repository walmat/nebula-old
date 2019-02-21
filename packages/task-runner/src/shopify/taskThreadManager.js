const path = require('path');

const constants = require('./classes/utils/constants');
const TaskManager = require('./taskManager');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

class TaskThreadManager extends TaskManager {
  constructor(loggerPath) {
    super(loggerPath);

    if (!global.window || !global.window.Worker) {
      throw new Error('This TaskManager Requires Webworker Threads!');
    }
  }

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
          resolve();
        }, 5000);
        const next = worker.onmessage;
        worker.onmessage = evt => {
          const { event } = evt.data;
          // make sure our message is a done message
          if (event === '__done') {
            this._logger.debug('Worker thread exited for task: %s', rId);
            if (forceKill) {
              clearTimeout(forceKill);
            }
            if (next) {
              // Run next message handler to perform cleanup of the worker
              next(evt);
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

  _setup(rId) {
    const worker = this._runners[rId];
    this._logger.verbose('Setting up Worker Thread Handlers for runner: %s', rId);
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === rId) {
        const args = [id, ...params];
        if (sideEffects) {
          // Call side effect before posting message
          sideEffects.apply(this, args);
        }
        worker.postMessage({
          target: 'worker',
          event,
          args,
        });
      }
    };
    const handlers = {
      onmessage: ({ data: { target, event, args } }) => {
        // Only handle events that target the main process
        if (target !== 'main') {
          return;
        }

        const eventHandlerMap = {
          [TaskRunnerEvents.TaskStatus]: this.mergeStatusUpdates,
          [TaskRunnerEvents.SwapProxy]: this.handleSwapProxy,
          [TaskManagerEvents.StartHarvest]: this.handleStartHarvest,
          [TaskManagerEvents.StopHarvest]: this.handleStopHarvest,
        };

        const handler = eventHandlerMap[event];
        if (handler) {
          handler.apply(this, args);
        }
      },
    };

    // Generate Handlers for each event
    [
      TaskManagerEvents.Abort,
      TaskManagerEvents.Harvest,
      TaskManagerEvents.SendProxy,
      TaskManagerEvents.ChangeDelay,
      TaskManagerEvents.UpdateHook,
    ].forEach(event => {
      let sideEffects;
      switch (event) {
        case TaskManagerEvents.SendProxy: {
          sideEffects = ([id, proxy]) => {
            // Store proxy on worker so we can release it during cleanup
            this._runners[id].proxy = proxy;
          };
          break;
        }
        default: {
          break;
        }
      }
      const handler = handlerGenerator(event, sideEffects);
      // Store handler for cleanup
      handlers[event] = handler;
      // Attach handler for event (with side effect if applicable)
      this._events.on(event, handler);
    });

    // Attach onmessage handler to worker
    worker.onmessage = handlers.onmessage;

    // Store handlers for cleanup
    this._handlers[rId] = handlers;
  }

  _cleanup(rId) {
    this._logger.verbose('Cleanup Worker Thread Handlers for runner: %s', rId);
    const handlers = this._handlers[rId];
    delete this._handlers[rId];

    // Remove onmessage handler
    this._runners[rId].onmessage = null;

    // Remove manager event handlers
    [
      TaskManagerEvents.Abort,
      TaskManagerEvents.Harvest,
      TaskManagerEvents.SendProxy,
      TaskManagerEvents.ChangeDelay,
      TaskManagerEvents.UpdateHook,
    ].forEach(event => {
      this._events.removeListener(event, handlers[event]);
    });
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
    this._setup(runnerId);

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
    this._cleanup(runnerId);

    // Terminate the worker thread
    worker.terminate();
  }
}

module.exports = TaskThreadManager;
