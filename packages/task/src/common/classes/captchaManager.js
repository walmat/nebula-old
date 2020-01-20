import EventEmitter from 'eventemitter3';

import { Manager } from '../constants';

const { Events } = Manager;

export default class CaptchaManager {
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
        task._handleHarvest(id, token);
      }
    };

    context.events.on(Events.StartHarvest, this.start, this);
    context.events.on(Events.StopHarvest, this.stop, this);

    this._events.on(Events.Harvest, handler, this);
    this._handlers[context.id] = handler;
  }

  detachHandler(task) {
    const { context } = task;

    // grab the handler function...
    const handler = this._handlers[context.id];

    // unregister the handler...
    this._events.removeListener(Events.Harvest, handler);

    // remove the handler from the map
    delete this._handlers[context.id];

    // lastly, since we're essentially shutting down a task here
    // we can go ahead and just remove all listeners from that task
    context.events.removeAllListeners();
  }

  // harvestCaptchaToken
  harvest(_, token, sitekey) {
    // Check if we have tokens to pass through
    const tokens = this._tokens.get(sitekey);
    this._logger.debug('Token queue length: %s', (tokens || []).length);
    if (tokens && tokens.length) {
      // Get the next task to pass the token
      const { id, priority } = tokens.shift();
      this._logger.debug('Grabbed requester: %s with priority %s', id, priority);
      // Use the task id to get the container
      // TODO: investigate what the container holds here..
      const container = this._requesters.get(id);
      if (!container) {
        // The current container no longer exists in the captcha queue,
        // Call recursively to get the next task
        this._logger.debug('Task not found! Recursive calling next task');
        this.harvest(id, token, sitekey);
      }
      // Send event to pass data to task
      this._logger.debug('Sending token to %s', id);
      this._events.emit(Events.Harvest, id, token);

      // stop the harvester for that task..
      this.stop(id, sitekey);
    }
  }

  // handle start harvest
  start(id, sitekey, host, checkpoint = true) {
    this._logger.debug('Inserting requester %s with %s priority', id, checkpoint ? 1 : 0);
    let container = this._requesters.get(id);

    console.log(id, sitekey, host, checkpoint);
    const priority = checkpoint ? 1 : 0;
    this._logger.error('%s container: %j', id, container);
    if (!container) {
      // We haven't started harvesting for this task yet, create a queue and start harvesting
      container = {};
      // Store the container on the captcha queue map
      this._requesters.set(id, container);

      let tokens = this._tokens.get(sitekey);
      this._logger.error('Tokens for %s: %j', sitekey, tokens);
      if (!tokens || !tokens.length) {
        this._tokens.set(sitekey, []);
        this._logger.debug('Pushing %s to first place in line', id);

        tokens = this._tokens.get(sitekey);
        tokens.push({ id, host, priority });

        this._events.emit(Events.StartHarvest, id, sitekey, host);
        return;
      }

      let contains = false;
      // priority check...
      this._logger.debug('Token queue length: %s', tokens.length);
      for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i].priority > priority) {
          this._logger.debug('Inserting %s as: %s place in line', id, i);
          tokens.splice(i, 0, { id, host, priority });
          contains = true;
          break;
        }
      }

      if (!contains) {
        this._logger.debug('Pushing %s to last place in line', id);
        // Add the task to the back of the token reserve queue
        tokens.push({ id, host, priority });
      }

      // Emit an event to start harvesting
      this._events.emit(Events.StartHarvest, id, sitekey, host, priority);
    }
  }

  // handle stop harvest
  stop(id, sitekey) {
    const container = this._requesters.get(id);

    this._logger.error('%s container: %j', id, container);
    // If this container was never started, there's no need to do anything further
    if (!container) {
      return;
    }

    // this will reject all calls currently waiting for a token
    this._requesters.delete(id);

    const tokens = this._tokens.get(sitekey);
    this._logger.error('Tokens for %s: %j', sitekey, this._tokens.get(sitekey));

    // if we have any tokens for that task, remove them
    if (tokens) {
      const newTokens = tokens.filter(({ id: tId }) => tId !== id);
      this._tokens.set(sitekey, newTokens);
    }

    this._logger.error('Tokens after filter %s: %j', sitekey, this._tokens.get(sitekey));

    // Emit an event to stop harvesting
    this._events.emit(Events.StopHarvest, id, sitekey);
  }
}
