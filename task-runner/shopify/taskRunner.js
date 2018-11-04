const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
const EventEmitter = require('events');

class TaskRunner {
    /**
     * Event Channel Constants
     */
    static get Events() {
        return {
            All: 'ALL',
            TaskStatus: 'TASK_STATUS',
            MonitorStatus: 'MONITOR_STATUS',
            CheckoutStatus: 'CHECKOUT_STATUS',
        };
    };

    /**
     * Task Runner States
     */
    static get States() {
        return {
            Initialized: 'INIT',
            Started: 'STARTED',
            GenAltCheckout: 'GEN_ALT_CHECKOUT',
            Monitor: 'MONITOR',
            SwapProxies: 'SWAP_PROXIES',
            Checkout: 'CHECKOUT',
            Finished: 'FINISHED',
            Aborted: 'ABORTED',
            Stopped: 'STOPPED',
        };
    }
    
    constructor(id, task, proxy, manager) {
        /**
         * The manager of this task runner
         */
        this._taskManager = manager;

        /**
         * Internal Task Runner State
         */
        this._state = TaskRunner.States.Initialized;

        /**
         * The context of this task runner
         * 
         * This is a wrapper that contains all data about the task runner.
         */
        this._context = {
            id,
            task,
            proxy,
            aborted: false,
        };

        /**
         * The id of this task runner
         */
        this.id = id;

        /**
         * Create a new monitor object to be used for the task
         */
        this._monitor = new Monitor(this._context);

        /**
         * Create a new checkout object to be used for this task
         */
        this._checkout = new Checkout(this._context);

        /**
         * Create a new event emitter to handle all IPC communication
         * 
         * Events will provide the task id, a message, and a message group
         */
        this._events = new EventEmitter();

        this._handleAbort = this._handleAbort.bind(this);
    }

    _handleAbort(id) {
        if (id === this._context.id) {
            this._context.aborted = true;
        }
    }

    _cleanup() {
        this._taskManager.removeListener('abort', this._handleAbort);
    }

    // MARK: Event Registration

    registerForEvent(event, callback) {
        switch(event) {
            case TaskRunner.Events.TaskStatus: {
                this._events.on(TaskRunner.Events.TaskStatus, callback);
                break;
            }
            case TaskRunner.Events.MonitorStatus: {
                this._events.on(TaskRunner.Events.MonitorStatus, callback);
                break;
            }
            case TaskRunner.Events.CheckoutStatus: {
                this._events.on(TaskRunner.Events.CheckoutStatus, callback);
                break;
            }
            case TaskRunner.Events.All: {
                this._events.on(TaskRunner.Events.TaskStatus, callback);
                this._events.on(TaskRunner.Events.MonitorStatus, callback);
                this._events.on(TaskRunner.Events.CheckoutStatus, callback);
            }
        }
    }

    deregisterForEvent(event, callback) {
        switch(event) {
            case TaskRunner.Events.TaskStatus: {
                this._events.removeListener(TaskRunner.Events.TaskStatus, callback);
                break;
            }
            case TaskRunner.Events.MonitorStatus: {
                this._events.removeListener(TaskRunner.Events.MonitorStatus, callback);
                break;
            }
            case TaskRunner.Events.CheckoutStatus: {
                this._events.removeListener(TaskRunner.Events.CheckoutStatus, callback);
                break;
            }
            case TaskRunner.Events.All: {
                this._events.removeListener(TaskRunner.Events.TaskStatus, callback);
                this._events.removeListener(TaskRunner.Events.MonitorStatus, callback);
                this._events.removeListener(TaskRunner.Events.CheckoutStatus, callback);
            }
            default: {
                break;
            }
        }
    }

    // MARK: Event Emitting
    _emitEvent(event, message) {
        console.log(event);
        switch(event) {
            case TaskRunner.Events.TaskStatus: {
                this._events.emit(TaskRunner.Events.TaskStatus, this._context.id, message, TaskRunner.Events.TaskStatus);
                this._events.emit(TaskRunner.Events.All, this._context.id, message, TaskRunner.Events.TaskStatus);
                break;
            }
            case TaskRunner.Events.MonitorStatus: {
                this._events.emit(TaskRunner.Events.MonitorStatus, this._context.id, message, TaskRunner.Events.MonitorStatus);
                this._events.emit(TaskRunner.Events.All, this._context.id, message, TaskRunner.Events.MonitorStatus);
                break;
            }
            case TaskRunner.Events.CheckoutStatus: {
                this._events.emit(TaskRunner.Events.CheckoutStatus, this._context.id, message, TaskRunner.Events.CheckoutStatus);
                this._events.emit(TaskRunner.Events.All, this._context.id, message, TaskRunner.Events.CheckoutStatus);
                break;
            }
            default: {
                break;
            }
        }
    }

    _emitTaskEvent(message) {
        this._emitEvent(TaskRunner.Events.TaskStatus, message);
    }

    _emitMonitorEvent(message) {
        this._emitEvent(TaskRunner.Events.MonitorStatus, message);
    }

    _emitCheckoutEvent(message) {
        this._emitEvent(TaskRunner.Events.CheckoutStatus, message);
    }

    // MARK: State Machine Step Logic

    async _handleStarted() {
        this._emitTaskEvent({
            message: 'Starting task...',
        });
        return TaskRunner.States.GenAltCheckout;
    }

    async _handleGenAltCheckout() {
        const res = await this._checkout.geenerateAlternativeCheckout();
        if(res.errors) {
            this._emitTaskEvent({
                message: 'Unable to Generate alternative checkout! Continuing on...',
                errors: res.errors,
            });
        }
        return TaskRunner.States.Monitor;
    }

    async _handleMonitor() {
        const res = await this._monitor.run();
        if(res.errors) {
            this._emitTaskEvent({
                message: 'Error with Monitor! Retrying...',
                errors: res.errors,
            });
        }
        // Monitor will be in charge of choosing the next state
        return res.nextState;
    }

    async _handleSwapProxies() {
        const res = await this._taskManager.swapProxies(this._context.id, this._context.proxy);
        if (res.errors) {
            this._emitTaskEvent({
                message: 'Error Swapping Proxies! Retrying Monitor...',
                errors: res.errors,
            });
        }
        // Swap Proxies will be in charge of choosing the next state
        return res.nextState;
    }

    async _handleCheckout() {
        const res = await this._checkout.run();
        if (res.errors) {
            this._emitTaskEvent({
                message: 'Errors during Checkout! Retrying Monitor...',
                errors: res.errors,
            });
        }
        // Checkout will be in charge of choosing the next state
        return res.nextState;
    }

    async _handleFinished() {
        this._emitTaskEvent({
            message: 'Task has finished!',
        });
        return TaskRunner.States.Stopped;
    }

    async _handleAborted() {
        this._emitTaskEvent({
            message: 'Task has aborted!',
        });
        return TaskRunner.States.Stopped;
    }

    async _handleStepLogic(currentState) {
        async function defaultHandler() {
            return currentState;
        }
        const stepMap = {
            [TaskRunner.States.Started]: this._handleStarted,
            [TaskRunner.States.GenAltCheckout]: this._handleGenAltCheckout,
            [TaskRunner.States.Monitor]: this._handleMonitor,
            [TaskRunner.States.SwapProxies]: this._handleSwapProxies,
            [TaskRunner.States.Checkout]: this._handleCheckout,
            [TaskRunner.States.Finished]: this._handleFinished,
            [TaskRunner.States.Aborted]: this._handleAborted,
        }
        const handler = stepMap[currentState] || defaultHandler;
        return await handler.call(this);
    }

    // MARK: State Machine Run Loop

    async start() {
        this._state = TaskRunner.States.Started;
        while(this._state !== TaskRunner.States.Stopped) {
            this._state = await this._handleStepLogic(this._state);
            if (this._context.aborted) {
                this._state = TaskRunner.States.Aborted;
            }
        }
        this._emitTaskEvent({
            message: 'Task has stopped.',
        });

        this._cleanup();
    }
}

module.exports = TaskRunner;