const TaskManager = require('./managers/taskManager');
const SplitThreadTaskManager = require('./managers/splitThreadTaskManager');
const SplitProcessTaskManager = require('./managers/splitProcessTaskManager');
const TaskRunner = require('./taskRunner');

module.exports = {
  TaskManager,
  SplitThreadTaskManager,
  SplitProcessTaskManager,
  TaskRunner,
};
