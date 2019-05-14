import EventEmitter from 'eventemitter3';
import request from 'request-promise';

import {
  SharedMonitorManager as ManagerConstants,
  SharedMonitor as MonitorConstants,
} from '../classes/utils/constants';
import { waitForDelay, reflect } from '../classes/utils';
import { AtomParser, JsonParser, XmlParser, Parser } from '../classes/parsers';
import ProxyManager from '../classes/proxyManager';

const { Events: ManagerEvents } = ManagerConstants;
const { Events: MonitorEvents, States } = MonitorConstants;

class SharedMonitor {
  constructor(id, task, proxies) {
    /**
     * @type { String } the id of the monitor process
     */
    this._id = id;

    /**
     * @type { Site } the shared site used by this monitor
     */
    this._site = task.site;

    /**
     * Delays that should be used for this monitor object
     */
    this._errorDelay = task.errorDelay;
    this._monitorDelay = task.monitorDelay;

    /**
     * Create a new event emitter to handle communication with the manager, even
     * through split contexts
     */
    this._events = new EventEmitter();
    this._proxyManager = new ProxyManager();

    /**
     * @type {List<String>} a list of ids for tasks currently being monitored
     */
    this.taskIds = [task.id];

    /**
     * @type {List<Task>} list of tasks that are being monitored
     */
    this._tasks = [task];

    /**
     * Proxy related variables
     */
    this._proxies = proxies;
    this._shouldBanProxy = 0;
    this._proxy = null;

    this._request = request.defaults({
      timeout: 20000,
      jar: request.jar(),
    });

    // TODO: are these necessary?
    this._fetchedProducts = {};
    this._productMapping = {};

    this._state = States.Start;

    // TODO: handle proper abort
    this._events.on(ManagerEvents.Abort, () => {}, this);
    this._events.on(ManagerEvents.AddTask, this._handleAddTask, this);
    this._events.on(ManagerEvents.RemoveTask, this._handleRemoveTask, this);
  }

  get state() {
    return this._state;
  }

  get id() {
    return this._id;
  }

  get proxy() {
    return this._proxy;
  }

  notifyProductUpdate(taskId, product) {
    this._events.emit(MonitorEvents.NotifyProduct, taskId, product);
  }

  async swapProxies() {
    const oldProxyId = this._proxy ? this._proxy.id : null;
    return new Promise(async (resolve, reject) => {
      let timeout = setTimeout(() => {
        if (timeout) {
          reject(new Error('Proxy Swapping Timed Out!'));
        }
      }, 10000);

      const newProxy = await this._proxyManager.swap(
        this._id,
        oldProxyId,
        this._site,
        this._shouldBanProxy,
      );
      if (newProxy) {
        clearTimeout(timeout);
        timeout = null;
        this._shouldBanProxy = 0;
        resolve(newProxy);
      }
    });
  }

  async _delay(status) {
    let delay = this._waitForRefreshDelay;
    let message = 'Monitoring for product';
    switch (status || 404) {
      case 401: {
        delay = this._waitForErrorDelay;
        break;
      }
      case 601: {
        message = 'Password page';
        break;
      }
      default:
        break;
    }
    await delay.call(this);
    this._logger.silly('Monitoring not complete, remonitoring...');
    return { message, nextState: States.Monitor };
  }

  async _handleParsingErrors(errors) {
    let delayStatus;
    let ban = true; // assume we have a softban
    let hardBan = false; // assume we don't have a hardban
    errors.forEach(({ status }) => {
      if (status === 403) {
        // ban is a strict hardban, so set the flag
        hardBan = true;
      } else if (status !== 429 && status !== 430) {
        // status is neither 403, 429, 430, so set ban to false
        ban = false;
      }
      if (!delayStatus && (status === ErrorCodes.ProductNotFound || status >= 400)) {
        delayStatus = status; // find the first error that is either a product not found or 4xx response
      }
    });
    if (ban || hardBan) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      // we can assume that it's a soft ban by default since it's either ban || hardBan
      this._shouldBanProxy = hardBan ? 2 : 1;
      return States.SwapProxies;
    }
    return this._delay(delayStatus || 404);
  }

  async _parseAll() {
    // TODO: Implement
    // We'll need to update the Parsers to handle multiple product inputs
    // Along with multiple product inputs, we need to handle multiple
    // product input types
    // The following process should allow us to receive all the data we need:
    // 1. Get parse types of all product inputs
    // 2. For all keywords parsing (if any exist):
    //   - make a single round of requests to xml, json, and atom endpoints
    //   - wait for all to finish and merge results
    //     - if all error out handle errors
    //   - Loop through keywords and attempt to match
    //   - Return list of urls that need more data
    // 3. For all url parsing
    //   - Check fetched results (from keyword parsing) for matching url
    //   - Return list of urls that need more data
    // 4. Fetch detailed product info for keyword/url url lists
    //   - Return list of products that have been matched
    // 5. Match product data to variants for all parsing types
    //   - keyword/Url need the detailed product, variants can return right away
    // 6. Emit events for matched products
    // 7. Repeat loop
    //
    // Some additional comments:
    // 1. Variant parsing types can exit/notify early since they've already been "matched"
    // 2. Before making addition requests for full product info, one last check should be
    //    made to ensure that the product input is still being tracked. This will prevent
    //    unnecessary requests from being made
    // 3. If the products.json endpoint is available, products can be matched directly on that
    //    (since the full data is included in the response). This early matching can prevent
    //    unnecessary full product requests from being made.
    // 4. There maybe some optimizations to parsing if we can fetch full product info asynchronously from the
    //    full product indexing -- this comes at the cost of increased proxy usage since mutiple requests
    //    could be happening at the same time instead of getting spread out.
  }

  async _handleParse() {
    // TODO: Implement
  }

  async _handleFilter() {
    // TODO: Implement
  }

  async _handleProcess() {
    // TODO: Implement
  }

  async _handleSwapProxy() {
    try {
      const newProxy = await this.swapProxies();

      // Proxy is fine, update the references
      if (newProxy) {
        const { proxy } = newProxy;
        this._proxy = proxy;
        this._shouldBanProxy = 0; // reset ban flag
        return this._prevState;
      }
      await waitForDelay(this._errorDelay);
    } catch (err) {
      // TOOD: handle proxy swapping errors
    }
    return this._prevState;
  }

  // MARK: State Machine Logic
  async _handleState(state) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    const stateMap = {
      [States.Parse]: this._handleParse,
      [States.Filter]: this._handleFilter,
      [States.Process]: this._handleProcess,
      [States.SwapProxies]: this._handleSwapProxies,
      [States.Abort]: () => States.Stop, // TODO: implement correct abort handler
      [States.Error]: () => States.Stop, // TODO: what should the error state do?
    };

    const handler = stateMap[state] || defaultHandler;
    return handler.call(this);
  }

  async run() {
    let nextState = this._state;

    try {
      nextState = await this._handleState(this._state);
    } catch (error) {
      console.log(error);
      nextState = States.Error;
    }

    if (this._state !== nextState) {
      this._prevState = this._state;
      this._state = nextState;
    }

    return this._state === States.Stop;
  }

  // MARK: Entry point for shared monitor
  async start() {
    this._prevState = States.Parse;
    this._nextState = States.Parse;

    this._proxyManager.registerAll(this._proxies);
    this._proxy = await this._proxyManager.reserve(this._id, this._site);

    let stop = false;
    while (this._state !== States.Stop && !stop) {
      // eslint-disable-next-line no-await-in-loop
      stop = await this.run();
    }

    // TODO: Perform cleanup (if necessary)
  }
}

module.exports = SharedMonitor;
