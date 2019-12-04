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
  }

  // harvestCaptchaToken
  harvest(_, token, sitekey) {
    // Check if we have tokens to pass through
    const tokens = this._tokens.get(sitekey);
    this._logger.debug('Token queue length: %s', (tokens || []).length);
    if (tokens && tokens.length) {
      // Get the next task to pass the token
      const { id, priority } = tokens.shift();
      this._logger.debug('TaskManager: Grabbed requester: %s with priority %s', id, priority);
      // Use the task id to get the container
      // TODO: investigate what the container holds here..
      const container = this._requesters.get(id);
      if (!container) {
        // The current container no longer exists in the captcha queue,
        // Call recursively to get the next task
        this._logger.debug('TaskManager: Task not found! Recursive calling next task');
        this.harvestCaptchaToken(id, token, sitekey);
      }
      // Send event to pass data to task
      this._logger.debug('TaskManager: Sending token to %s', id);
      this._events.emit(Events.Harvest, id, token);

      // stop the harvester for that task..
      this.stop(id, sitekey);
    }
  }

  // handle start harvest
  start(id, sitekey, host, priority = 1) {
    this._logger.debug('Inserting requester %s with %s priority', id, priority);
    let container = this._requesters.get(id);
    if (!container) {
      // We haven't started harvesting for this task yet, create a queue and start harvesting
      container = {};
      // Store the container on the captcha queue map
      this._requesters.set(id, container);

      const tokens = this._tokens.get(sitekey);

      if (!tokens) {
        this._tokens.set(sitekey, []);
        this._logger.debug('Pushing %s to first place in line', id);

        tokens.push({ id, host, priority });

        this._events.emit(Events.StartHarvest, id, sitekey, host);
        return;
      }

      let contains = false;
      // priority checks...
      this._logger.debug('Token queue length: %s', tokens.length);
      for (let i = 0; i < tokens.length; i += 1) {
        // if the new items priority is less than, splice it in place.
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
      this._events.emit(Events.StartHarvest, id, sitekey, host);
    }
  }

  // handle stop harvest
  stop(id, sitekey) {
    const container = this._requesters.get(id);

    // If this container was never started, there's no need to do anything further
    if (!container) {
      return;
    }

    // this will reject all calls currently waiting for a token
    this._requesters.delete(id);

    const tokens = this._tokens.get(sitekey);

    // if we have any tokens for that task, remove them
    if (tokens) {
      tokens.filter(({ id: tId }) => tId !== id);
    }

    // Emit an event to stop harvesting
    this._events.emit(Events.StopHarvest, id, sitekey);
  }
}
