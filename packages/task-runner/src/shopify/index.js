const TaskManager = require('./managers/taskManager');
const SplitWebWorkerTaskManager = require('./managers/splitWebWorkerTaskManager');
const SplitProcessTaskManager = require('./managers/splitProcessTaskManager');
const TaskRunner = require('./runners/taskRunner');
const ShippingRatesRunner = require('./runners/shippingRatesRunner');
const {
  TaskRunner: { Types: TaskRunnerTypes },
} = require('./classes/utils/constants');

module.exports = {
  TaskManager,
  SplitWebWorkerTaskManager,
  SplitProcessTaskManager,
  TaskRunner,
  ShippingRatesRunner,
  TaskRunnerTypes,
};
