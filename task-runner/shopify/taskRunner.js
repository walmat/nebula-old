const EventEmitter = require('events');

const { Stack } = require('./classes/stack');
const Monitor = require('./classes/monitor');
const Checkout = require('./classes/checkout');
const Account = require('./classes/account');
const { States, Events } = require('./classes/utils/constants').TaskRunner;
const { createLogger } = require('../common/logger');
const jar = require('request').jar();
const request = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
})
const {
    waitForDelay
} = require('./classes/utils');

class TaskRunner {
    constructor(id, task, proxy, manager) {
        /**
         * The manager of this task runner
         */
        this._taskManager = manager;

        /**
         * Logger Instance
         */
        this._logger = createLogger({ dir: this._taskManager.loggerPath, name: `TaskRunner-${id}`, filename: `runner-${id}.log` });;

        /**
         * Internal Task Runner State
         */
        this._state = States.Initialized;

        /**
         * Stack of successfully created payment tokens for the runner
         */
        this._paymentTokens = new Stack();
        
        /**
         * Stack of successfully created checkout sessions for the runner 
         */
        this._checkouts = new Stack();

        /**
         * The context of this task runner
         * 
         * This is a wrapper that contains all data about the task runner.
         * @type {TaskRunnerContext}
         */
        this._context = {
            id,
            task,
            proxy,
            request,
            logger: this._logger,
            aborted: false,
        };

        /**
         * Create a new monitor object to be used for the task
         */
        this._monitor = new Monitor(this._context);

        /**
         * Create a new checkout object to be used for this task
         */
        this._checkout = new Checkout({
            ...this._context,
            getCaptcha: this.getCaptcha.bind(this),
            paymentTokens: this._paymentTokens,
            checkouts: this._checkouts,
            stopHarvestCaptcha: this.stopHarvestCaptcha.bind(this),
        });

        this._account = new Account(this._context, this._timer, request);

        /**
         * Create a new event emitter to handle all IPC communication
         * 
         * Events will provide the task id, a message, and a message group
         */
        this._events = new EventEmitter();

        this._handleAbort = this._handleAbort.bind(this);

        this._taskManager._events.on('abort', this._handleAbort);
    }

    _waitForErrorDelay() {
        this._logger.debug('Waiting for error delay...');
        return waitForDelay(this._context.task.errorDelay);
    }

    _handleAbort(id) {
        if (id === this._context.id) {
            this._context.aborted = true;
        }
    }

    _cleanup() {
        this._taskManager._events.removeListener('abort', this._handleAbort);
    }

    // MARK: Event Registration

    async getCaptcha() {
        return this._taskManager.startHarvestCaptcha(this._context.id);
    }

    stopHarvestCaptcha() {
        this._taskManager.stopHarvestCaptcha(this._context.id);
    }

    registerForEvent(event, callback) {
        switch(event) {
            case Events.TaskStatus: {
                this._events.on(Events.TaskStatus, callback);
                break;
            }
            case Events.QueueBypassStatus: {
                this._events.on(Events.QueueBypassStatus, callback);
                break;
            }
            case Events.MonitorStatus: {
                this._events.on(Events.MonitorStatus, callback);
                break;
            }
            case Events.CheckoutStatus: {
                this._events.on(Events.CheckoutStatus, callback);
                break;
            }
            case Events.All: {
                this._events.on(Events.TaskStatus, callback);
                this._events.on(Events.QueueBypassStatus, callback);
                this._events.on(Events.MonitorStatus, callback);
                this._events.on(Events.CheckoutStatus, callback);
            }
        }
    }

    deregisterForEvent(event, callback) {
        switch(event) {
            case Events.TaskStatus: {
                this._events.removeListener(Events.TaskStatus, callback);
                break;
            }
            case Events.QueueBypassStatus: {
                this._events.removeListener(Events.QueueBypassStatus, callback);
                break;
            }
            case Events.MonitorStatus: {
                this._events.removeListener(Events.MonitorStatus, callback);
                break;
            }
            case Events.CheckoutStatus: {
                this._events.removeListener(Events.CheckoutStatus, callback);
                break;
            }
            case Events.All: {
                this._events.removeListener(Events.TaskStatus, callback);
                this._events.removeListener(Events.QueueBypassStatus, callback);
                this._events.removeListener(Events.MonitorStatus, callback);
                this._events.removeListener(Events.CheckoutStatus, callback);
            }
            default: {
                break;
            }
        }
    }

    // MARK: Event Emitting
    _emitEvent(event, payload) {
        switch(event) {
            // Emit supported events on their specific channel
            case Events.TaskStatus:
            case Events.QueueBypassStatus:
            case Events.MonitorStatus:
            case Events.CheckoutStatus: {
                this._events.emit(event, this._context.id, payload, event);
                break;
            }
            default: {
                break;
            }
        }
        // Emit all events on the All channel
        this._events.emit(Events.All, this._context.id, payload, event);
        this._logger.verbose('Event %s emitted: %j', event, payload);
    }

    _emitTaskEvent(payload) {
        this._emitEvent(Events.TaskStatus, payload);
    }

    _emitQueueBypassEvent(payload) {
        this._emitEvent(Events.QueueBypassStatus, payload);
    }

    _emitMonitorEvent(payload) {
        this._emitEvent(Events.MonitorStatus, payload);
    }

    _emitCheckoutEvent(payload) {
        this._emitEvent(Events.CheckoutStatus, payload);
    }

    // MARK: State Machine Step Logic

    async _handleStarted() {
        this._emitTaskEvent({
            message: 'Initializing...',
        });
        return States.GeneratePaymentTokens;
    }

    /**
     * Preharvest payment tokens
     */
    async _handleGeneratePaymentTokens() {

        while (this._paymentTokens.size() < 5) {
            const token = await this._checkout.generatePaymentToken();
            if (token) {
                this._paymentTokens.push(token);
            }
        }
        return States.GenerateCheckouts;
    }

    // Generate checkout links to be used for checking out
    async _handleGenerateCheckouts() {

        // TODO - Find random in-stock product through our parsers
        // ^^ if this fails, we shouldn't do the next while() loop
        // instead, do task setup later

        // TODO - decide how many checkouts to actually preharvest
        while (this._checkouts.size() < 3) {
            const res = await this._checkout.createCheckout();
            // break if we're in a checkout queue..
            if (res && res.checkout) {
                this._checkouts.push(checkout);
            }
        }
        return States.Monitor;
    }

    async _handleMonitor() {
        const res = await this._monitor.run();
        if(res.errors) {
            this._logger.verbose('Monitor Handler completed with errors: %j', res.errors);
            this._emitTaskEvent({
                message: 'Error monitoring product...',
                errors: res.errors,
            });
            await this._waitForErrorDelay();
        }
        this._emitTaskEvent({
            message: res.message,
        });
        // Monitor will be in charge of choosing the next state
        return res.nextState;
    }

    async _handleSwapProxies() {
        const res = await this._taskManager.swapProxies(this._context.id, this._context.proxy);
        if (res.errors) {
            this._logger.verbose('Swap Proxies Handler completed with errors: %j', res.errors);
            this._emitTaskEvent({
                message: 'Error Swapping Proxies! Retrying Monitor...',
                errors: res.errors,
            });
            await this._waitForErrorDelay();
        }
        // Swap Proxies will be in charge of choosing the next state
        return res.nextState;
    }

    async _handleCheckout() {
        const res = await this._checkout.run();
        if (res.errors) {
            this._logger.verbose('Checkout Handler completed with errors: %j', res.errors);
            this._emitTaskEvent({
                message: 'Errors during Checkout!',
                errors: res.errors,
            });
            await this._waitForErrorDelay();
        }
        this._emitTaskEvent({
            message: res.message,
        });
        // Checkout will be in charge of choosing the next state
        return res.nextState;
    }

    _generateEndStateHandler(state) {
        let status = 'stopped';
        switch (state) {
            case States.Aborted: {
                status = 'aborted';
                break;
            }
            case States.Errored: {
                status = 'errored out';
                break;
            }
            case States.Finished: {
                status = 'finished';
                break;
            }
            default: {
                break;
            }
        }
        return () => {
            this._emitTaskEvent({
                message: this._context.status || `Task has ${status}!`,
            });
            return States.Stopped;
        }
    }

    async _handleStepLogic(currentState) {
        async function defaultHandler() {
            throw new Error('Reached Unknown State!');
        }

        this._logger.verbose('Handling state: %s', currentState);

        const stepMap = {
            [States.Started]: this._handleStarted,
            [States.GeneratePaymentTokens]: this._handleGeneratePaymentTokens,
            [States.GenerateCheckouts]: this._handleGenerateCheckouts,
            [States.Monitor]: this._handleMonitor,
            [States.SwapProxies]: this._handleSwapProxies,
            [States.Checkout]: this._handleCheckout,
            [States.Finished]: this._generateEndStateHandler(States.Finished),
            [States.Errored]: this._generateEndStateHandler(States.Errored),
            [States.Aborted]: this._generateEndStateHandler(States.Aborted),
        }
        const handler = stepMap[currentState] || defaultHandler;
        return await handler.call(this);
    }

    // MARK: State Machine Run Loop

    async start() {
        this._state = States.Started;
        while(this._state !== States.Stopped) {
            if (this._context.aborted) {
                this._state = States.Aborted;
            }
            try {
                this._state = await this._handleStepLogic(this._state);
            } catch (e) {
                this._logger.debug('Run loop errored out! %s', e);
                this._state = States.Errored;
            }
            this._logger.verbose('Run Loop finished, state transitioned to: %s', this._state);
        }

        this._cleanup();
        return;
    }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
