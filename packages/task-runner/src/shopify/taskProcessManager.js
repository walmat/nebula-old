const childProcess = require('child_process');
const path = require('path');

const constants = require('./classes/utils/constants');
const TaskManager = require('./taskManager');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

class TaskProcessManager extends TaskManager {
  /**
   * Stop a Task
   *
   * Performs the super classes stop task operation (sending the abort signal),
   * but supports additional options specific to process management:
   * - wait - if the wait option is passed, this method will wait for the
   *   child process to exit before finishing
   */
  async stop(task, options = {}) {
    const rId = super.stop(task, options);
    if (!rId) {
      return null;
    }

    if (options.wait) {
      const child = this._runners[rId];
      await new Promise(resolve => {
        let forceKill;
        forceKill = setTimeout(() => {
          this._logger.debug(
            'Child process abort timeout reached for task: %s, killing child process...',
            rId,
          );
          // clear out the timeout handler so we don't trigger the clearTimeout call
          forceKill = null;
          // force kill the child process
          child.kill();
          resolve();
        }, 5000);
        child.on('exit', () => {
          this._logger.debug('Child process exited for task: %s', rId);
          if (forceKill) {
            clearTimeout(forceKill);
          }
          resolve();
        });
      });
    }
    return rId;
  }

  /**
   * Stop multiple tasks
   *
   * Performs the super classes stop tasks operation,
   * but supports additional options specific to process management:
   * - force - if the force option is passed, this method will stop all child processes
   * - wait - if the wait option is passed, this method will wait for child processes to close
   */
  async stopAll(tasks, options) {
    return Promise.all(super.stopAll(tasks, options));
  }

  _setup(rId) {
    const child = this._runners[rId];
    this._logger.verbose('Setting up Child Process Handlers for runner: %s', rId);
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === rId) {
        const args = [id, ...params];
        if (sideEffects) {
          // Call side effect before posting message
          sideEffects.apply(this, args);
        }
        child.send({
          target: 'child',
          event,
          args,
        });
      }
    };
    const handlers = {
      child: ({ target, event, args }) => {
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

    // Attach child handler to child process
    child.on('message', handlers.child);

    // Store handlers for cleanup
    this._handlers[rId] = handlers;
  }

  _cleanup(rId) {
    this._logger.verbose('Cleaning up Child Process Handlers for runner: %s', rId);
    const handlers = this._handlers[rId];
    delete this._handlers[rId];

    // Remove child handler
    this._runners[rId].removeListener('message', handlers.child);

    // Remove manager event handlers
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
    this._logger.verbose('Spawning Child Process for runner: %s', runnerId);
    const child = childProcess.fork(path.resolve(__dirname, 'runnerProcess.js'));
    // Setup ids
    child.id = runnerId;
    child.taskId = task.id;
    child.proxy = openProxy;
    this._runners[runnerId] = child;

    // Perform Child Process Setup
    this._setup(runnerId);

    // Start the runner
    let doneHandler;
    try {
      child.send({
        target: 'child',
        event: '__start',
        args: [runnerId, task, openProxy, this._loggerPath],
      });
      await new Promise((resolve, reject) => {
        doneHandler = ({ target, event, args, error }) => {
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
              break;
            }
          }
        };
        doneHandler = doneHandler.bind(this); // is this necessary?
        child.on('message', doneHandler);
      });
      this._logger.info('Runner %s finished without errors', runnerId);
    } catch (error) {
      this._logger.error('Runner %s was stopped due to error: %s', runnerId, error.message, error);
    }

    // Remove the done handler first
    child.removeListener('message', doneHandler);

    // Perform Child Process Cleanup
    this._cleanup(runnerId);

    // Kill the child process
    child.kill();
  }
}

module.exports = TaskProcessManager;
