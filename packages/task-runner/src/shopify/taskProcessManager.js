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

  _setup(child) {
    this._logger.verbose('Setting up Child Process Handlers for runner: %s', child.id);
    const handlers = {
      abort: id => {
        if (id === child.id) {
          child.send({
            target: 'child',
            event: 'abort',
            args: [id],
          });
        }
      },
      harvest: (id, token) => {
        if (id === child.id) {
          child.send({
            target: 'child',
            event: TaskManagerEvents.Harvest,
            args: [id, token],
          });
        }
      },
      proxy: (id, proxy) => {
        if (id === child.id) {
          // eslint-disable-next-line no-param-reassign
          child.proxy = proxy; // update the latest proxy so we can release it at the end
          child.send({
            target: 'child',
            event: TaskRunnerEvents.ReceiveProxy,
            args: [id, proxy],
          });
        }
      },
      delay: (id, delay, type) => {
        if (id === child.id) {
          child.send({
            target: 'child',
            event: TaskManagerEvents.ChangeDelay,
            args: [id, delay, type],
          });
        }
      },
      child: ({ target, event, args }) => {
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
    // Attach child handler to child process
    child.on('message', handlers.child);

    // Store handlers for cleanup
    this._handlers[child.id] = handlers;
  }

  _cleanup(child) {
    this._logger.verbose('Cleaning up Child Process Handlers for runner: %s', child.id);
    const { abort, harvest, proxy, delay, child: childHandler } = this._handlers[child.id];
    delete this._handlers[child.id];

    // Remove child handler
    child.removeListener('mesage', childHandler);

    // Remove manager event handlers
    this._events.removeListener('abort', abort);
    this._events.removeListener(TaskManagerEvents.Harvest, harvest);
    this._events.removeListener(TaskManagerEvents.SendProxy, proxy);
    this._events.removeListener(TaskManagerEvents.ChangeDelay, delay);
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
    this._setup(child);

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
      this._logger.error(
        'Runner %s was stopped due to an errors: %s',
        runnerId,
        error.message,
        error,
      );
    }

    // Remove the done handler first
    child.removeListener('message', doneHandler);

    // Perform Child Process Cleanup
    this._cleanup(child);

    // Kill the child process
    child.kill();
  }
}

module.exports = TaskProcessManager;
