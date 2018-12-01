const Threads = require('threads');
const { spawn, config } = Threads;

class TaskThreadManager extends TaskManager {
    constructor(context) {

        // TODO - construct properly

        config.set({
            basepath: {
                node: `${__dirname}/thread-scripts/`,
            },
        });
    }

    async start(task) {
        const taskThread = spawn('task.js');
        
    }

}

module.exports = TaskThreadManager;
