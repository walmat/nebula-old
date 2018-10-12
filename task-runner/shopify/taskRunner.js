const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
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

        /**
         * Create a new event emitter to handle all IPC communication
         */
        this._events = new EventEmitter();

    }

    registerForEvent(event, callback) { 
        this._events.on(event, callback);
    }

    emitEvent() {
        this._events.emit('monitor-status', 'initializing...')
    }

}

module.exports = TaskRunner;