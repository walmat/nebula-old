const { Monitor } = require('./classes/monitor');
const task = require('./testTask');
const EventEmitter = require('events');

class TaskRunner {
    
    constructor(task, proxy) {
        /**
         * Create a new monitor object to be used for the task
         */
        this._monitor = new Monitor(task, proxy);

        /**
         * Create a new checkout object to be used for this task
         */
        this._checkout = new Checkout(task, proxy);

        
    }
}

module.exports = TaskRunner;