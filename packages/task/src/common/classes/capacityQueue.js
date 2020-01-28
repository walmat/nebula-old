class CapacityQueue {
  constructor(data = [], size = 100) {
    this.stack = data;
    this.size = size;
  }

  insert(datum = {}) {
    this.stack.push(datum);

    if (this.stack.length > this.size) {
      this.shift();
    }
  }

  pop() {
    this.stack.pop();
  }

  shift() {
    this.stack.shift();
  }

  /**
   * Removes a certain data from the priority queue.
   * @param {any} datum - datum to remove from the queue
   * @param {Number?} startIndex Index to start the search on (slight optimization instead of looping over all elements). Can be combined with the `all` flag to only remove all occurences after a certain index.
   * @param {Boolean} all - whether or not to remove all occurences of datum
   */
  // eslint-disable-next-line class-methods-use-this
  remove(datum = null, startIndex = 0, all = false) {
    // TODO:
  }
}

export default CapacityQueue;
