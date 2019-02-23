/* eslint class-methods-use-this: ["error", { "exceptMethods": ["wireErrors", "send", "receive"] }] */
const TaskRunnerContextTransformer = require('./base');

class TaskRunnerProcessTransformer extends TaskRunnerContextTransformer {
  constructor(contextName = 'child') {
    super(contextName);
  }

  wireErrors(errorTransformer) {
    process.on('uncaughtException', errorTransformer.bind(this));
    process.on('unhandledRejection', errorTransformer.bind(this));
  }

  send(payload) {
    process.send(payload);
  }

  receive(handler) {
    process.on('message', ({ target, event, args }) => handler.call(this, target, event, args));
  }
}

const transformer = new TaskRunnerProcessTransformer();
transformer.start();
