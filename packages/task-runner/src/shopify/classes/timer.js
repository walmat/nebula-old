class Timer {
  constructor() {
    this._total = 0;
    this._start = null;
    this._end = null;
  }

  /**
   * Starts the timer by setting the start time
   * @param {UTC Timestamp} time - now();
   */
  start(time) {
    this._start = time;
  }

  /**
   * Stops the timer by clearing the start and end time
   */
  stop(time) {
    this._end = time;
    this._total += this._end - this._start;
  }

  /**
   * Resets the runtime Timer
   */
  reset() {
    this._start = null;
    this._end = null;
  }

  /**
   * Gets the start time for the Timer
   * @return {UTC Timestamp} - start time of the Timer
   */
  getStartTime() {
    return this._start;
  }

  /**
   * Gets the end time for the Timer
   */
  getEndTime() {
    return this._end;
  }

  /**
   * Gets the runtime of the Timer class
   * @return
   */
  getRunTime(time) {
    return (time - this._start).toFixed(3);
  }

  getTotalTime() {
    return this._total.toFixed(3);
  }
}

module.exports = Timer;
