/**
 * Async Queue
 *
 * A variant of a Queue with synchronous inserts and
 * asynchronous returns. If there is a backlog, the
 * returns are synchronous
 */
class AsyncQueue {
  constructor() {
    this._backlog = [];
    this._waitQueue = [];
  }

  get backlogLength() {
    return this._backlog.length;
  }

  get lineLength() {
    return this._waitQueue.length;
  }

  insert(datum) {
    // Check if we have anybody waiting for data
    if (this._waitQueue.length) {
      // Get the resolution and invoke it with the data
      const resolution = this._waitQueue.pop();
      resolution.resolve(datum);
    } else {
      // Add data to the backlog
      this._backlog.unshift(datum);
    }
    return this._backlog.length;
  }

  next() {
    // Check if we don't have any waiters and we do have a backlog
    if (!this._waitQueue.length && this._backlog.length) {
      // return from the backlog immediately
      return Promise.resolve(this._backlog.pop());
    }

    // Return a new promise that waits in line for data
    return new Promise((resolve, reject) => {
      this._waitQueue.push({ resolve, reject });
    });
  }

  clear() {
    // Remove all items from the backlog if they exist
    this._backlog = [];
  }

  destroy() {
    // Reject all resolutions in the wait queue
    this._waitQueue.forEach(r => {
      r.reject('Queue was destroyed');
    });
    this._waitQueue = [];

    // Remove all items from the backlog if they exist
    this.clear();
  }
}

module.exports = AsyncQueue;
