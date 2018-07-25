class Queue {
    /**
     * Create a queue.
     */
    constructor () {
        this.store = {};
        this.front = 0;
        this.end = 0;
    }
}
 
/**
 * Add item to end of queue.
 * @param {*} The data to store in the position.
 */
Queue.prototype.enqueue = function (data) {
    this.store[this.end] = data;
    this.end++;
};

/**
 * Return current size of queue.
 * @return {number} Size of queue.
 */
Queue.prototype.size = function () {
    return this.end - this.front;
};


/**
 * Returns a randomized person from the queue
 */
Queue.prototype.pop = function () {
    if (this.size() === 0) return null;

    var engine = Random.engines.mt19937().autoSeed();
    var distribution = Random.integer(0, 99);

    this.store[distribution(engine)]
}

