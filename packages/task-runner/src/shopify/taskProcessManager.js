const childProcess = require('child_process');
const path = require('path');

const constants = require('./classes/utils/constants');
const TaskManager = require('./taskManager');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

class TaskProcessManager extends TaskManager {
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
          case TaskRunnerEvents.ChangeDelay: {
            this.changeDelay(...args);
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
    // Attach child handler to child process
    child.on('message', handlers.child);

    // Store handlers for cleanup
    this._handlers[child.id] = handlers;
  }

  _cleanup(child) {
    this._logger.verbose('Cleaning up Child Process Handlers for runner: %s', child.id);
    const { abort, harvest, proxy, child: childHandler } = this._handlers[child.id];
    delete this._handlers[child.id];

    // Remove child handler
    child.removeListener('mesage', childHandler);

    // Remove manager event handlers
    this._events.removeListener('abort', abort);
    this._events.removeListener(TaskManagerEvents.Harvest, harvest);
    this._events.removeListener(TaskManagerEvents.SendProxy, proxy);
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
