class Monitor {
    /**
     * 
     * @param {Task Object} task 
     * @param {String} proxy 
     */
    constructor(task, proxy) {

        /**
         * Task Data for the running task
         * @type {TaskObject}
         */
        this._task = task;

        /**
         * Proxy to run the task with
         * @type {String}
         */
        this._proxy = proxy;
    }

    run() {

    }
}

module.exports = Monitor;