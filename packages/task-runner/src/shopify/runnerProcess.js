/**
 * This script is run in a child process by the TaskProcessManager
 *
 * The goal of this script is to wire events between processes and
 * act as a silent man-in-the-middle between the TaskManager and TaskRunner.
 */
const constants = require('./classes/utils/constants');
const TaskRunner = require('./taskRunner');

const TaskManagerEvents = constants.TaskManager.Events;
const TaskRunnerEvents = constants.TaskRunner.Events;

/**
 * Notify the main process that and error occured
 *
 * @param {Error} error
 */
function forwardError(error) {
  process.send({
    target: 'main',
    event: '__error',
    error,
  });
}

let errorHandlersWired = false;
function wireErrorHandlers() {
  if (errorHandlersWired) {
    return;
  }
  // Attach Runner Handlers to Errors
  process.on('uncaughtException', forwardError);
  process.on('unhandledRejection', forwardError);
  errorHandlersWired = true;
}

function wireEventHandlers(runner) {
  // Handle Incoming Process Events by calling the correct runner methods
  process.on('message', ({ target, event, args }) => {
    // Only respond to events that are targetting the child
    if (target !== 'child') {
      return;
    }

    // Only Handle Certain Events
    switch (event) {
      case 'abort': {
        // TODO: Respect the scope of Runner
        runner._handleAbort(...args);
        break;
      }
      case TaskManagerEvents.Harvest: {
        // TODO: Respect the scope of Runner
        runner._handleHarvest(...args);
        break;
      }
      default: {
        break;
      }
    }
  });

  // Forward Runner Events to the Main Process
  [
    TaskRunnerEvents.TaskStatus,
    TaskManagerEvents.StartHarvest,
    TaskManagerEvents.StopHarvest,
  ].forEach(event => {
    // TODO: Respect the scope of Runner
    runner._events.on(event, (...args) => {
      process.send({
        target: 'main',
        event,
        args,
      });
    });
  });
}

function cleanupEventHandlers(runner) {
  // Detach runner event listeners
  // TODO: Respect the scope of Runner
  runner._events.removeAllListeners();
}

// Create the Runner, wire up events, run it, then cleanup events
async function _start([rId, task, proxy, loggerPath]) {
  const runner = new TaskRunner(rId, task, proxy, loggerPath);
  wireEventHandlers(runner);
  await runner.start();
  cleanupEventHandlers(runner);
}

// Setup a handler to listen for the start message...
process.on('message', async ({ target, event, args }) => {
  // Ensure target is slave, and event correct
  if (target !== 'slave' || event !== '__start') {
    return;
  }

  wireErrorHandlers();
  await _start(args);
  process.send({
    target: 'main',
    event: '__done',
  });
});
