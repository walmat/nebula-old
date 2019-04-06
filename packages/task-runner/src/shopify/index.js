const TaskManager = require('./managers/taskManager');
const SplitWebWorkerTaskManager = require('./managers/splitWebWorkerTaskManager');
const SplitWorkerThreadTaskManager = require('./managers/splitWorkerThreadTaskManager');
const SplitProcessTaskManager = require('./managers/splitProcessTaskManager');
const TaskRunner = require('./runners/taskRunner');
const ShippingRatesRunner = require('./runners/shippingRatesRunner');
const {
  TaskRunner: { Types: TaskRunnerTypes },
} = require('./classes/utils/constants');

module.exports = {
  TaskManager,
  SplitWorkerThreadTaskManager,
  SplitWebWorkerTaskManager,
  SplitProcessTaskManager,
  TaskRunner,
  ShippingRatesRunner,
  TaskRunnerTypes,
};
