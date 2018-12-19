const { spawn } = require('threads');

const TaskManager = require('./taskManager');

class TaskProcessManager extends TaskManager {
  async _start([runnerId, task, openProxy]) {
    const thread = spawn(super._start);
    thread.send([runnerId, task, openProxy]);
  }
}

module.exports = TaskProcessManager;
