const TaskRunnerContextTransformer = require('./base');

class TaskRunnerWorkerTransformer extends TaskRunnerContextTransformer {
  constructor(contextName = 'worker') {
    super(contextName);

    // store a list of message handlers to chain
    this._messageHandlers = [];

    // Attach a single message handler that chains all the others
    global.onmessage = ({ data: { target, event, args } }) => {
      // construct chain
      const chainedHandler = this._messageHandlers.reduce(
        (next, handler) => async () => {
          await Promise.resolve(handler.call(this, target, event, args, next));
        },
        null,
      );
      // invoke it
      chainedHandler();
    };
  }

  // TODO: Research if there is another way to implement this
  // without needing the eslint-disable comment
  // eslint-disable-next-line class-methods-use-this
  wireErrors(errorTransformer) {
    global.onerror = errorTransformer;
  }

  // TODO: Research if there is another way to implement this
  // without needing the eslint-disable comment
  // eslint-disable-next-line class-methods-use-this
  send(payload) {
    global.postMessage(payload);
  }

  receive(handler) {
    this._messageHandlers.push(handler);
  }
}

const transformer = new TaskRunnerWorkerTransformer();
transformer.start();
