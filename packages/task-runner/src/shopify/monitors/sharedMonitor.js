import EventEmitter from 'eventemitter3';
import request from 'request-promise';

import {
  ErrorCodes,
  SharedMonitorManager as ManagerConstants,
  SharedMonitor as MonitorConstants,
  ProductInputType,
  ParserType,
} from '../classes/utils/constants';
import { waitForDelay } from '../classes/utils';
import { getProductInputType } from '../classes/utils/parse';
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

    // Step 1: group tasks by product input type
    const grouped = {};
    this._tasks.forEach(t => {
      const inputType = getProductInputType(t.product);
      if (!grouped[inputType]) {
        grouped[inputType] = [t];
      } else {
        grouped[inputType].push(t);
      }
    });

    // Step 2a/3a: Fetch and merge (if applicable) products from sitewide endpoints
    let mergedResults = {};
    if (grouped[ProductInputType.Keywords]) {
      // Fetch data from all endpoints:
      const results = await Promise.all(
        [
          new JsonParser(this._request, null, this._proxy, null),
          new AtomParser(this._request, null, this._proxy, null),
          new XmlParser(this._request, null, this._proxy, null),
        ].map(parser => parser.run().then(products => ({ products }), err => ({ err }))),
      );

      // Merge product data:
      mergedResults = results.reduce((accum, result) => {
        if (result.err) {
          // Skip because we received an error
          // TODO: Handle this error!
          return accum;
        }
        const newResults = {};
        result.products.forEach(prod => {
          if (!accum[prod.url]) {
            newResults[prod.url] = prod;
          } else {
            // TODO: overwrite existing result if newer updated_at tag
          }
        });
        return {
          ...accum,
          ...newResults,
        };
      }, {});
      if (Object.keys(mergedResults).length === 0) {
        // All were errors, so we need to handle them
        // TODO: handle errors
      }
    } else if (grouped[ProductInputType.Url]) {
      const result = await new JsonParser(this._request, null, this._proxy, null)
        .run()
        .then(products => ({ products }), err => ({ err }));
      if (result.err) {
        // Skip because we received an error
        // TODO: Handle this error!
      } else {
        // Store results in shared merged results
        result.products.forEach(prod => {
          mergedResults[prod.url] = prod;
        });
      }
    }

    // We should now have merged results if we have either keywords or product
    // urls, so perform the various matching techniques with that dataset to
    // determine which matches are done and which matches need an extra request

    // Step 2b/3b: Match fetched dataset and determine full matches and partial ones.
    const keywordFullMatches = [];
    const keywordPartialMatches = [];
    if (grouped[ProductInputType.Keywords]) {
      // Matching for keywords on the mergedResults dataset
      const parser = new JsonParser(this._request, null, this._proxy, null);
      // TODO: update parser to allow setting products without accessing internal variable
      parser._products = grouped[ProductInputType.Keywords];

      const keywordMatches = parser.matchAll(Object.values(mergedResults));
      keywordMatches.forEach(match => {
        if (match.__type === ParserType.Json) {
          keywordFullMatches.push(match);
        } else if (!(match instanceof Error)) {
          keywordPartialMatches.push(match);
        } else {
          // TODO: Handle this error!
        }
      });
    }
    const urlFullMatches = [];
    const urlPartialMatches = [];
    if (grouped[ProductInputType.Url]) {
      // Matching for urls on the mergedResults dataset
      const parser = new JsonParser(this._request, null, this._proxy, null);
      // TODO: update parser to allow setting products without accessing internal variable
      parser._products = grouped[ProductInputType.Url];

      const urlMatches = parser.matchAll(Object.values(mergedResults));
      urlMatches.forEach(match => {
        if (match.__type === ParserType.Json) {
          urlFullMatches.push(match);
        } else if (!(match instanceof Error)) {
          urlPartialMatches.push(match);
        } else {
          // TODO: Handle this error!
        }
      });
    }

    // TODO: Include a check to make sure we still need to fetch the full product info
    // Step 4: Fetch full data from partial endpoints
    const keywordPartialResolvedMatches = [];
    const urlPartialResolvedMatches = [];
    const fetchFullData = async (partial, array) => {
      let product;
      try {
        // TODO: Include a timed wait in between each link to prevent soft bans...
        product = await Parser.getFullProductInfo(partial.url, this._proxy, this._request, null);
      } catch (err) {
        // TODO: Handle this error!
        product = null; // use null to keep the same index
      }
      array.push(product);
    };
    // Setup a chain on requests to get full data for partial keyword matches
    await keywordPartialMatches.reduce(
      (chain, partial) => chain.then(() => fetchFullData(partial, keywordPartialResolvedMatches)),
      Promise.resolve(),
    );

    // Setup a chain on requests to get full data for partial url matches
    await urlPartialMatches.reduce(
      (chain, partial) => chain.then(() => fetchFullData(partial, urlPartialResolvedMatches)),
      Promise.resolve(),
    );

    // Step 5a: Match fully resolved products back to task product inputs
    // TODO: Implement this! Need to do an audit on data structures used above and
    // add in a mapping from resolved product info back to task id.

    // Step 5b: Match fetched products back to variants based on size
    // TODO: Implement this! on hold until we complete step 5a.

    // Step 6: Notify manager of product matches
    // TODO: Need to decide on preferred method of notification
    // Likely will be event emission.
  }

  async _handleParse() {
    // TODO: Implement
    // Fetch the latest product data
    // (handle errors)
    // Merge product data together with each other AND existing product data
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
