const path = require('path');

const SplitContextTaskManager = require('./splitContextTaskManager');

class WebWorkerContext {
  static chainify(data, handlers, thisArg) {
    return handlers.reduce(
      (next, handler) => async () => {
        await Promise.resolve(handler.call(thisArg, data, next));
      },
      () => {},
    );
  }

  constructor(rId, task, proxy) {
    if (!global.window || !global.window.Worker) {
      throw new Error('Web Worker Threads are required for this context!');
    }
    this.id = rId;
    this.taskId = task.id;
    this.site = task.site.url;
    this.proxy = proxy;
    this._name = 'Web Workers';
    this._target = 'worker';
    this._errorHandlers = [];
    this._messageHandlers = [];
    this._worker = new global.window.Worker(path.resolve(__dirname, '../runnerScripts/worker.js'));
    this._worker.onmessage = ({ data }) => {
      // construct chain
      const chainedHandler = WebWorkerContext.chainify(data, this._messageHandlers, this);
      // invoke it
      chainedHandler();
    };

    this._worker.onerror = ({ data }) => {
      // construct chain
      const chainedHandler = WebWorkerContext.chainify(data, this._errorHandlers, this);
      // invoke it
      chainedHandler();
    };

    this.isExitPayload = payload => payload.event === '__done';
  }

  get name() {
    return this._name;
  }

  get target() {
    return this._target;
  }

  send(payload) {
    this._worker.postMessage(payload);
  }

  on(channel, handler) {
    // Webworkers only have two handlers: onmessage and onerror
    // Check for the error channel, and default everything else
    // to the message channel
    if (channel === 'error') {
      this._errorHandlers.push(handler);
    } else {
      this._messageHandlers.push(handler);
    }
  }

  removeListener(channel, handler) {
    // Webworkers only have two handlers: onmessage and onerror
    // Check for the error channel, and default everything else
    // to the message channel
    if (channel === 'error') {
      this._errorHandlers = this._errorHandlers.filter(h => h !== handler);
    } else {
      this._messageHandlers = this._messageHandlers.filter(h => h !== handler);
    }
  }

  kill() {
    this._worker.terminate();
  }
}

class SplitWebWorkerTaskManager extends SplitContextTaskManager {
  constructor(loggerPath) {
    super(loggerPath, WebWorkerContext);
    if (!global.window || !global.window.Worker) {
      throw new Error('Web Worker Threads are required for this task manager!');
    }
  }
}

module.exports = SplitWebWorkerTaskManager;
