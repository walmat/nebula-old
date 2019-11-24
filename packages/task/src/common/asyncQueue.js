/**
 * Async Queue
 *
 * A variant of a Queue with synchronous inserts and
 * asynchronous returns. If there is a backlog, the
 * returns are synchronous
 */
export default class AsyncQueue {
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
      resolution.request.status = 'fulfilled';
      resolution.request.value = datum;
      resolution.resolve(datum);
    } else {
      // Add data to the backlog
      this._backlog.unshift(datum);
    }
    return this._backlog.length;
  }

  next() {
    // initialize request
    const nextRequest = {
      status: 'pending', // status of the request
      cancel: null, // function to cancel the request with a given reason
      promise: null, // the async promise that is waiting for the next value
      reason: '', // the reason for cancelling the request
      value: null, // the resolved value
    };

    // Check if we don't have any waiters and we do have a backlog
    if (!this._waitQueue.length && this._backlog.length) {
      // return from the backlog immediately
      const value = this._backlog.pop();
      const promise = Promise.resolve(value);
      return {
        ...nextRequest,
        status: 'fulfilled',
        promise,
        value,
      };
    }

    // Setup request promise and cancel function
    nextRequest.promise = new Promise((resolve, reject) => {
      nextRequest.cancel = reason => {
        nextRequest.status = 'cancelled';
        nextRequest.reason = reason;
        this._waitQueue = this._waitQueue.filter(r => r.request !== nextRequest);
        reject(reason);
      };
      this._waitQueue.push({ resolve, reject, request: nextRequest });
    });

    return nextRequest;
  }

  clear() {
    // Remove all items from the backlog if they exist
    this._backlog = [];
  }

  destroy() {
    // Reject all resolutions in the wait queue
    this._waitQueue.forEach(({ reject, request }) => {
      request.status = 'destroyed';
      request.reason = 'Queue was destroyed';
      reject('Queue was destroyed');
    });
    this._waitQueue = [];

    // Remove all items from the backlog if they exist
    this.clear();
  }
}
