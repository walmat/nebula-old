/**
 * This script is run in a worker thread by the TaskThreadManager
 *
 * The goal of this script is to wire events between the worker and main thread
 * and act as a silent man-in-the-middle between the TaskManager and TaskRunner
 */
const constants = require('./classes/utils/constants');
const TaskRunner = require('./taskRunner');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

/**
 * Notify the main process that an error occurred
 *
 * @param {Error} error
 */
function forwardError(error) {
  const { stack, message, filename, lineno } = error;
  global.postMessage({
    target: 'main',
    event: '__error',
    error: { stack, message, filename, lineno },
  });
}

let errorHandlerWired = false;
function wireErrorHandler() {
  if (errorHandlerWired) {
    return;
  }

  // Attach Runner Handlers to Errors
  global.onerror = forwardError;
  errorHandlerWired = true;
}

function wireEventHandlers(runner) {
  // Handle Incoming Process Events by calling the correct runner methods
  global.onmessage = ({ data: { target, event, args } }) => {
    // Only respond to events that are targeting the worker
    if (target !== 'worker') {
      return;
    }

    // Only Handle Certain Events
    switch (event) {
      case 'abort': {
        // TODO: Respect the scope of Runner (issue #137)
        runner._handleAbort(...args);
        break;
      }
      case TaskManagerEvents.Harvest: {
        // TODO: Respect the scope of Runner (issue #137)
        runner._handleHarvest(...args);
        break;
      }
      case TaskRunnerEvents.ReceiveProxy: {
        // TODO: Respect the scope of Runner (issue #137)
        runner._events.emit(TaskRunnerEvents.ReceiveProxy, ...args);
        break;
      }
      case TaskManagerEvents.ChangeDelay: {
        // TODO: Respect the scope of Runner (issue #137)
        runner._events.emit(TaskManagerEvents.ChangeDelay, ...args);
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
  };

  // Forward Runner Events to the Main Process
  [
    TaskRunnerEvents.TaskStatus,
    TaskManagerEvents.StartHarvest,
    TaskManagerEvents.StopHarvest,
    TaskRunnerEvents.SwapProxy,
  ].forEach(event => {
    // TODO: Respect the scope of Runner (issue #137)
    runner._events.on(event, (...args) => {
      global.postMessage({
        target: 'main',
        event,
        args,
      });
    });
  });
}

function cleanupEventHandlers(runner) {
  // Detach runner event listeners
  // TODO: Respect the scope of Runner (issue #137)
  runner._events.removeAllListeners();
}

// Create the Runner, wire up events, run it, then cleanup events
async function _start([rId, task, proxy, loggerPath]) {
  const runner = new TaskRunner(rId, task, proxy, loggerPath);
  wireEventHandlers(runner);
  await runner.start();
  cleanupEventHandlers(runner);
}

// Setup an initial handler to listen for the start message...
global.onmessage = async ({ data: { target, event, args } }) => {
  // Ensure target is worker, and event is correct
  if (target !== 'worker' || event !== '__start') {
    return;
  }

  wireErrorHandler();
  await _start(args);
  global.postMessage({
    target: 'main',
    event: '__done',
  });
};
