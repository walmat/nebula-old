const constants = require('../classes/utils/constants');
const TaskRunner = require('../runners/taskRunner');
const ShippingRatesRunner = require('../runners/shippingRatesRunner');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;
const RunnerTypes = constants.TaskRunner.Types;

/**
 * This class is the base for all split-context runners
 *
 * The goal of this script is to wire events from the parent
 * context to the child context by acting as a silent man-in-the-middle.
 *
 * This class is intended to be an abstact class that should NOT be instantiated.
 * Instead, subclasses should be created that implement the `send`, `receive` and
 * `wireErrors` methods. All functionality in this base class relies on these methods
 * to transform data between the parent and child context. By moving all functionality
 * here and only requiring the `send`, `receive` and `wireErrors` methods to be implemented
 * by subclasses, adding subclasses to transform different contexts is simple and easy.
 * Further, code duplication is minimized.
 */
class TaskRunnerContextTransformer {
  constructor(contextName) {
    if (this.constructor === TaskRunnerContextTransformer) {
      throw new TypeError('Cannot instantiate base class! Create a Subclass!');
    }
    this._contextName = contextName;
    this._started = false;

    // Wire errors using the given error transformer
    this.wireErrors(this._errorTransformer.bind(this));
  }

  /**
   * Transform payload into structured data
   *
   * This method takes the incoming payload from the main context
   * and transforms it to structured data that can be used by the
   * transformer. The following information should be includeded in
   * the returned object:
   * - target - the target of this payload
   * - event - the event associated with this payload
   * - args - any additional arguments associated with the event
   *
   * @param {Object} payload - incoming payload from main context
   * @returns {Object} an object that contains the target, event, and args from the payload
   */
  tranform() {
    if (this.constructor === TaskRunnerContextTransformer) {
      throw new TypeError('Cannot instantiate base class! Create a Subclass!');
    }
    throw new Error('This method must be implemented!');
  }

  /**
   * Wire Errors using a given error transformer
   *
   * If an error occurs outside of the TaskRunner, catch it. The given
   * transformer will by default send the error to the main context so
   * it can respond accordingly.
   *
   * @param {Function} errorTransformer - function that accepts an error instance and sends it to the main context
   */
  wireErrors() {
    if (this.constructor === TaskRunnerContextTransformer) {
      throw new TypeError('Cannot instantiate base class! Create a Subclass!');
    }
    throw new Error('This method must be implemented!');
  }

  /**
   * Send data to the main context
   *
   * @param {Object} payload - the data to send to the main context
   */
  send() {
    if (this.constructor === TaskRunnerContextTransformer) {
      throw new TypeError('Cannot instantiate base class! Create a Subclass!');
    }
    throw new Error('This method must be implemented!');
  }

  /**
   * Receive payload from the main context
   *
   * This method should attach a handler that responds to data received from
   * the main context. The handler has several parameters:
   * - target - the target of this payload (should be the `contextName` given to the transformer)
   * - event - the event associated with this payload
   * - args - any additional arguments associated with the event
   * - next (Optional) - a reference to the next handler that should be called if the transformer requires chaining handlers
   *
   * @param {Function} handler - handler to call when payload has been received
   */
  receive() {
    if (this.constructor === TaskRunnerContextTransformer) {
      throw new TypeError('Cannot instantiate base class! Create a Subclass!');
    }
    throw new Error('This method must be implemented!');
  }

  /**
   * Start the context transformer
   *
   * Start listening for an initial 'start' message from the main
   * context. This will handle creating the TaskRunner, wiring
   * connections for events. Running the task, then cleaning up
   * the event handlers. Finally, a `__done` message will be sent
   * to the main context so it can dispose of the child context.
   */
  start() {
    this.receive(async (target, event, args, next) => {
      if (this._started || target !== this._contextName || event !== '__start') {
        // Runner should not be started, continue onto next handler (if applicable)
        if (next) {
          next();
        }
        return;
      }

      // start the runner
      this._started = true;
      await this._start(args);
      // notify main context we are done
      this.send({
        target: 'main',
        event: '__done',
      });
    });
  }

  /**
   * Start the TaskRunner
   *
   * This is a convenience method to group all functions necessary
   * with starting/running a task runner. Transformers can just await this
   * method instead of having to copy the body of this method.
   *
   * @param {array} args - arguments needed to create a TaskRunner instance
   */
  async _start(args) {
    const [type, ...params] = args;
    let runner;
    if (type === RunnerTypes.Normal) {
      runner = new TaskRunner(...params);
    } else if (type === RunnerTypes.ShippingRates) {
      runner = new ShippingRatesRunner(...params);
    }
    if (!runner) {
      // Return early if we couldn't create the runner;
      return;
    }
    this._wireEvents(runner);
    await runner.start();
    runner._events.removeAllListeners();
  }

  /**
   * Notify the main context that an error occurred
   *
   * @param {Error} error
   */
  _errorTransformer(error) {
    const { stack, message, filename, lineno } = error;
    this.send({
      target: 'main',
      event: '__error',
      error: { stack, message, filename, lineno },
    });
  }

  /**
   * Wire events between main context and TaskRunner
   *
   * Use the receive method to listen for events and send them
   * to the task runner.
   *
   * Use the send method to pass messages from the task runner to
   * the main context on certain task runner events.
   *
   * @param {TaskRunner} runner - instance on which events will be attached
   */
  _wireEvents(runner) {
    this.receive((target, event, args, next) => {
      // Only respond to events meant for the child context
      if (target !== this._contextName) {
        return;
      }

      // Only Handle Certain Events
      switch (event) {
        case TaskManagerEvents.Abort: {
          // TODO: Respect the scope of Runner (issue #137)
          runner._handleAbort(...args);
          break;
        }
        case TaskManagerEvents.Harvest: {
          // TODO: Respect the scope of Runner (issue #137)
          runner._handleHarvest(...args);
          break;
        }
        case TaskManagerEvents.SendProxy: {
          // TODO: Respect the scope of Runner (issue #137)
          runner._events.emit(TaskRunnerEvents.ReceiveProxy, ...args);
          break;
        }
        case TaskManagerEvents.ChangeDelay: {
          // TODO: Respect the scope of Runner (issue #137)
          runner._events.emit(TaskManagerEvents.ChangeDelay, ...args);
          break;
        }
        case TaskManagerEvents.ChangeLink: {
          runner._events.emit(TaskManagerEvents.ChangeLink, ...args);
          break;
        }
        case TaskManagerEvents.ChangePassword: {
          runner._events.emit(TaskManagerEvents.ChangePassword, ...args);
          break;
        }
        case TaskManagerEvents.UpdateHook: {
          // TODO: Respect the scope of Runner (issue #137)
          runner._events.emit(TaskManagerEvents.UpdateHook, ...args);
          break;
        }
        default: {
          break;
        }
      }

      if (next) {
        // Call next handler if it exists
        next();
      }
    });

    // Forward Runner Events to the Main Process
    [
      TaskRunnerEvents.TaskStatus,
      TaskManagerEvents.StartHarvest,
      TaskManagerEvents.StopHarvest,
      TaskRunnerEvents.SwapProxy,
    ].forEach(event => {
      // TODO: Respect the scope of Runner (issue #137)
      runner._events.on(event, (...args) => {
        this.send({
          target: 'main',
          event,
          args,
        });
      });
    });
  }
}

module.exports = TaskRunnerContextTransformer;
