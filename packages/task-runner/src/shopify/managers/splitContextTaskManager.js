const constants = require('../classes/utils/constants');
const TaskManager = require('./taskManager');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

class SplitContextTaskManager extends TaskManager {
  constructor(loggerPath, ContextCtor) {
    super(loggerPath);
    this._ContextCtor = ContextCtor;
  }

  /**
   * Stop a Task
   *
   * Performs the superclass's stop task operation (sending the abort signal),
   * but supports additional options specific to split context management:
   * - wait - if the wait options is passed, this method will wait for the
   *   child context to exit before returning.
   */
  async stop(task, options = {}) {
    const rId = super.stop(task, options);
    if (!rId) {
      return null;
    }

    if (options.wait) {
      const childContext = this._runners[rId];
      await new Promise(resolve => {
        let forceKill;
        forceKill = setTimeout(() => {
          this._logger.silly('%s abort timeout reached for task: %s', childContext.name, rId);
          // Clear out the timeout handler so we don't trigger the clearTimeout call
          forceKill = null;
          // Force kill the child context
          childContext.kill();
          resolve();
        }, 5000);
        childContext.on('exit', (payload, next = () => {}) => {
          if (childContext.isExitPayload(payload)) {
            this._logger.silly('%s exited for task: %s', childContext.name, rId);
            if (forceKill) {
              clearTimeout(forceKill);
            }
            // Run next handler to continue chain (if applicable)
            next();
            resolve();
          }
          // Run next handler to continue chain (if applicable)
          next();
        });
      });
    }
    return rId;
  }

  /**
   * Stop Multiple Tasks
   *
   * Performs the superclass's stop tasks operation, but supports additioanl
   * options specific to split-context management:
   * - force - if the force option is passed, this method will stop all tasks
   * - wait - if the wait options is passed, this method will wait for the
   *   child context to exit before returning.
   */
  async stopAll(tasks, options) {
    return Promise.all(super.stopAll(tasks, options));
  }

  _setup(rId) {
    const childContext = this._runners[rId];
    this._logger.silly('Setting up %s handlers for runner: %s', childContext.name, rId);
    const handlerGenerator = (event, sideEffects) => (id, ...params) => {
      if (id === rId || id === 'ALL') {
        const args = [rId, ...params];
        if (sideEffects) {
          // Call side effect before sending message
          sideEffects.apply(this, args);
        }
        childContext.send({
          target: childContext.target,
          event,
          args,
        });
      }
    };
    const handlers = {
      receiveHandler: ({ target, event, args }, next = () => {}) => {
        // Only handle events that target the main context
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

        // Call next handler for chaining (if applicable)
        next();
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
          sideEffects = (id, proxy) => {
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

    // Attach message handler to child context
    childContext.on('message', handlers.receiveHandler);

    // Store handlers for cleanup
    this._handlers[rId] = handlers;
  }

  _cleanup(rId) {
    const childContext = this._runners[rId];
    this._logger.silly('Cleanup %s handlers for runner: %s', childContext.name, rId);
    const handlers = this._handlers[rId];
    delete this._handlers[rId];

    // Remove message handler
    childContext.removeListener('message', handlers.receiveHandler);

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

  async _start([runnerId, task, openProxy, type]) {
    this._logger.silly('Spawning Child Context for runner: %s', runnerId);
    const childContext = new this._ContextCtor(runnerId, task, openProxy);
    this._runners[runnerId] = childContext;

    // Perform child context setup
    this._setup(runnerId);

    // Start the runner
    let doneHandler;
    try {
      childContext.send({
        target: childContext.target,
        event: '__start',
        args: [type, runnerId, task, openProxy, this._loggerPath],
      });
      await new Promise((resolve, reject) => {
        // create handler reference so we can clean it up later
        doneHandler = ({ target, event, args, error }, next = () => {}) => {
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

          // Call next handler for chaining (if applicable)
          next();
        };
        childContext.on('message', doneHandler);
      });
      this._logger.silly('Runner %s finished without errors', runnerId);
    } catch (error) {
      this._logger.error('Runner %s was stopped due to errors: %s', runnerId, error.message);
    }

    // Perform child context cleanup
    childContext.removeListener('message', doneHandler);
    this._cleanup(runnerId);

    childContext.kill();
  }
}

module.exports = SplitContextTaskManager;
