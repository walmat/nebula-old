const Threads = require('threads');
const { spawn, config } = Threads;

class TaskThreadManager extends TaskManager {
    constructor(context) {
        super(context);

        config.set({
            basepath: {
                node: `${__dirname}/thread-scripts/`,
            },
        });
    }

    async start(task) {
        const taskThread = spawn(super.start);
    }

}

module.exports = TaskThreadManager;
