/* eslint-disable class-methods-use-this */
import EventEmitter from 'eventemitter3';

import { Manager } from '../constants';

const { Events } = Manager;

export default class SecureManager {
  constructor(logger) {
    this._logger = logger;
    // Captcha Map
    this._requesters = new Map();
    this._tokens = new Map();
    this._events = new EventEmitter();

    // Handlers Map
    this._handlers = {};

    this.harvest = this.harvest.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.attachHandler = this.attachHandler.bind(this);
    this.detachHandler = this.detachHandler.bind(this);
  }

  attachHandler(task) {
    const { context } = task;
    const handler = (id, token) => {
      if (id === context.id) {
        task._handleSecure(id, token);
      }
    };

    context.events.on(Events.StartSecure, this.start, this);
    context.events.on(Events.StopSecure, this.stop, this);

    this._events.on(Events.Secure, handler, this);
    this._handlers[context.id] = handler;
  }

  detachHandler(task) {
    const { context } = task;

    // grab the handler function...
    const handler = this._handlers[context.id];

    // unregister the handler...
    this._events.removeListener(Events.Secure, handler);

    // remove the handler from the map
    delete this._handlers[context.id];

    // lastly, since we're essentially shutting down a task here
    // we can go ahead and just remove all listeners from that task
    context.events.removeAllListeners();
  }

  // harvest secure token
  harvest(_, id) {
    console.log('HARVESTING SECURE: %j', id);
  }

  // handle start secure
  start(id) {
    this._logger.debug('Inserting requester %s', id);
    let container = this._requesters.get(id);
    if (!container) {
      // We haven't started secure for this task yet, create a queue and start it
      container = {};
      // Store the container on the secure queue map
      this._requesters.set(id, container);

      // Emit an event to start secure
      this._events.emit(Events.StartSecure, id);
    }
  }

  // handle stop secure
  stop(id) {
    const container = this._requesters.get(id);

    // If this container was never started, there's no need to do anything further
    if (!container) {
      return;
    }

    // this will reject all calls currently waiting for a token
    this._requesters.delete(id);

    // Emit an event to stop harvesting
    this._events.emit(Events.StopSecure, id);
  }
}
