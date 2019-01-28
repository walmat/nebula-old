const EventEmitter = require('events');
// const shortid = require('shortid');

const { Events } = require('./index');

class ProxyManager {
  constructor() {
    this._events = new EventEmitter();

    this._handlers = {};
    this._proxies = {};

    // event listeners
    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
    this.handleStartGenerate = this.handleStartGenerate.bind(this);
    this.handleStopGenerate = this.handleStopGenerate.bind(this);
  }

  registerForProxyEvents(callback) {
    this._events.on('proxy', callback);
  }

  deregisterForProxyEvents(callback) {
    this._events.removeListener('proxy', callback);
  }

  handleStartGenerate(type) {
    this._events.emit(Events.StartGenerate, type);
  }

  handleStopGenerate(type) {
    this._events.emit(Events.StopGenerate, type);
  }
}
module.exports = ProxyManager;
