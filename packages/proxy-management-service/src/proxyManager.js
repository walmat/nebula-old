const EventEmitter = require('events');
// const shortid = require('shortid');

const { Events, Types, Providers } = require('./index');

class ProxyManager {
  constructor() {
    this._events = new EventEmitter();

    this._handlers = {};
    this._proxies = {};

    // event listeners
    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
  }

  registerForProxyEvents(callback) {
    this._events.on('generator_status', callback);
  }

  deregisterForProxyEvents(callback) {
    this._events.removeListener('generator_status', callback);
  }

  mergeStatusUpdates(id, message, event) {
    if (event === Events.STATUS) {
      this._events.emit('generator_status', id, message, event);
    }
  }

  isRunning(data) {
    return !!this._proxies.find(p => p.data.id === data.id);
  }

  start(data, { type = Types.AWS }) {
    const running = Object.values(this._proxies).find(p => p.id === data.id);

    if (running) {
      return;
    }

    this._start([data, type]).then(() => this.cleanup());
  }

  stop(data) {
    const id = Object.keys(this._proxies).find(p => this._proxies[p].id === data.id);

    if (!id) {
      return null;
    }
    this._events.emit(Events.ABORT, id);
    return id;
  }

  // TODO: figure this out!
  destroy(data) {}

  destroyAll(data) {
    return [...data].map(p => this.destroy(p));
  }

  stopAll(data, { force }) {
    let toStop = data;

    if (force) {
      toStop = Object.values(this._proxies).map(({ id }) => ({ id }));
    }
    return [...toStop].map(p => this.stop(p));
  }

  _cleanup(generator) {
    const handlers = this._handlers[generator.id];
    delete this._handlers[generator.id];

    generator.deregisterForEvent(Events.Status, this.mergeUpdates);

    generator._events.removeAllListeners();

    [Events.Abort].forEach(e => this._events.removeListener(e, handlers[e]));
  }

  async _start([data, type]) {
    let generator;

    switch (type) {
      case Types.AWS: {
        generator = new Providers.AWS(data);
        break;
      }
      default: {
        break;
      }
    }

    if (!generator) {
      return;
    }

    this._proxies[data.id] = generator;

    try {
      await generator.start();
    } catch (error) {
      console.log(error);
    }

    this._cleanup(generator);
  }
}
module.exports = ProxyManager;
