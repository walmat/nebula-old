/* eslint-disable no-restricted-syntax */
import EventEmitter from 'eventemitter3';
import HttpsProxyAgent from 'https-proxy-agent';
import hash from 'object-hash';
import { generate } from 'shortid';
import { Manager } from '../constants';

export default class ProxyManager {
  get proxies() {
    return this._proxies;
  }

  constructor(logger, tasks) {
    this._logger = logger;
    this._tasks = tasks;
    this._proxies = new Map();
    this._events = new EventEmitter();
    this.retry = 1000; // retry delay for swapping
  }

  format(rawData) {
    this._logger.debug('Formatting proxy data %s...', rawData);

    if (process.env.NODE_ENV === 'development' && /^127/i.test(rawData)) {
      return 'http://127.0.0.1:8888';
    }

    if (!rawData || /^(127.*|localhost)/.test(rawData)) {
      return null;
    }

    // subnet proxies
    if (/^http/.test(rawData)) {
      const [schema, subnet, port, user, pass] = rawData.split(':');
      const sub = subnet.replace(/\//g, '');
      if (user && pass) {
        return `${schema}://${user}:${pass}@${sub}:${port}`;
      }
      return `${schema}://${sub}:${port}`;
    }

    const [ip, port, user, pass] = rawData.split(':');

    if (user && pass) {
      return `http://${user}:${pass}@${ip}:${port}`;
    }
    return `http://${ip}:${port}`;
  }

  /**
   * Register a Proxy
   *
   * This method adds a given proxy to the availability proxy pool if it has
   * not been added already. Once added, tasks are able to reserve
   * the given proxy.
   *
   * @param {Proxy} proxy the proxy to register
   */
  register(proxy) {
    this._logger.debug('Registering proxy...');
    let id;
    const proxyHash = hash(proxy);
    for (const p of this._proxies.values()) {
      if (p.hash.includes(proxyHash)) {
        this._logger.debug('Proxy already exists with hash %s! proxy not added', proxyHash);
        return;
      }
    }
    this._logger.debug('New Proxy Detected with hash %s. Adding now', proxyHash);
    do {
      id = generate();
    } while (this._proxies.get(id));

    const formattedProxy = this.format(proxy);

    this._logger.debug('Adding proxy: %s', formattedProxy);

    this._proxies.set(id, {
      id,
      hash: proxyHash,
      raw: proxy,
      proxy: new HttpsProxyAgent(formattedProxy),
      use: {},
    });
    this._logger.debug('Proxy Added with id %s', id);
  }

  /**
   * Deregister a Proxy
   *
   * This method removes a given proxy from the availability pool, but does
   * not stop the proxy from being used if already in use. A task
   * that has reserved this proxy will continue to use it until the task
   * stops or until the task attempts to swap the proxy.
   *
   * @param {Proxy} proxy the proxy to deregister
   */
  deregister(proxy) {
    this._logger.debug('Deregistering proxy...');
    const proxyHash = hash(proxy);
    let stored = null;
    for (const p of this._proxies.values()) {
      if (p.hash === proxyHash) {
        stored = p;
        break;
      }
    }

    if (!stored) {
      this._logger.debug('Proxy with hash %s not found! Skipping removal', proxyHash);
      return;
    }

    this._logger.debug('Emitting event to remove proxy from tasks %j', stored.tasks);
    this._events.emit(Manager.Events.DeregisterProxy, stored.tasks);

    this._logger.debug('Proxy found with hash %s. Removing now', proxyHash);
    this._proxies.delete(stored.id);
    this._logger.debug('Proxy removed with id %s', stored.id);
  }

  /**
   * Reserve a proxy
   *
   * @param {String} id the id of the task for whom the proxy will be reserved
   * @param {String} store the store to reserve the proxy for
   * @param {String} wait whether or not this method should wait for an open proxy
   * @param {Number} timeout the recursive call limit on proxy reservations
   */
  async reserve(id, store, wait = false, timeout = 5) {
    let newTimeout = timeout;
    if (!timeout || Number.isNaN(timeout) || timeout < 0) {
      // Force wait limit to be 0 if we have an invalid parameter value passed in
      newTimeout = 0;
    }

    if (!this._proxies.size) {
      this._logger.debug('No proxies available! Skipping reserve');
      return null;
    }

    this._logger.debug(
      'Reserving proxy for task %s for store %s... Looking through %d proxies',
      id,
      store,
      this._proxies.size,
    );
    let proxy = null;

    for (const p of this._proxies.values()) {
      this._logger.debug('%s: in use?: %j', p.proxy, p.use[store]);
      if (!p.use[store]) {
        proxy = p;
        // immediately remove the proxy from the list
        this._proxies.delete(proxy.id);
        // set it to in use
        proxy.use[store] = true;
        // push the proxy back onto the end of the stack
        this._proxies.set(proxy.id, proxy);
        this._logger.debug('Returning proxy: %s', proxy.raw);
        return proxy;
      }
    }
    if (!wait || !newTimeout) {
      this._logger.debug('Not waiting for open proxy, returning null');
      return null;
    }
    this._logger.debug('All proxies are reserved, waiting for open proxy...');
    return new Promise(resolve => {
      setTimeout(
        async () => resolve(await this.reserve(id, store, wait, newTimeout - 1)),
        this.retry,
      ); // wait 1s then try again (should we change this timeout to something smaller?)
    });
  }

  /**
   * Release a proxy
   *
   * @param {String} id the id of the task this proxy is being released from
   * @param {String} proxyId the id of the proxy to release
   */
  async release(id, store, proxyId) {
    this._logger.debug('Releasing proxy %s for task %s on store %s...', proxyId, id, store);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.debug('No proxy found, skipping release');
      return;
    }
    // otherwise, just free up the use list
    delete proxy.use[store];
    this._logger.debug('Released Proxy %s', proxyId);
  }

  /**
   * Swap a proxy for a task
   *
   * This method swaps a proxy for a given task. If the proxy needs to
   * banned, that is done as well. A fresh proxy is returned for further
   * use.
   *
   * @param {String} id the task who needs the proxy
   * @param {String} proxyId the old proxy to release
   * @param {String} store the store the proxy is banned
   * @param {bool} shouldBan whether the old proxy should be banned
   */
  async swap(id, proxyId, store) {
    let shouldRelease = true;

    const oldProxy = this._proxies.get(proxyId);

    if (!oldProxy) {
      this._logger.debug('No old proxy found, skipping release');
      shouldRelease = false;
    }

    this._logger.debug('Attempting to swap: %j', oldProxy ? oldProxy.raw : null);

    // Attempt to reserve a proxy first before releasing the old one
    const newProxy = await this.reserve(id, store);

    this._logger.debug(
      'Swapped old proxy: %s \n Returned new proxy: %s',
      oldProxy ? oldProxy.raw : null,
      newProxy ? newProxy.raw : null,
    );

    // Check if we need to release the old proxy
    if (shouldRelease) {
      this._logger.debug('Releasing old proxy... %s', oldProxy.raw);
      await this.release(id, store, proxyId);
    }

    if (!newProxy) {
      this._logger.debug('No new proxy available, skipping release/ban');
      return null;
    }

    this._logger.debug('New proxy: %j', newProxy.raw);
    return newProxy;
  }

  /**
   * Register Multiple Proxies
   *
   * This is a convenience method to handle registering multiple proxies with
   * a single call.
   *
   * @param {List<Proxy>} proxies list of proxies to register
   */
  registerAll(proxies) {
    proxies.forEach(p => this.register(p));
  }

  /**
   * Deregister Multiple Proxies
   *
   * This is a convenience method to handle deregistering multiple proxies with
   * a single call.
   *
   * @param {List<Proxy>} proxies list of proxies to deregister
   */
  deregisterAll(proxies) {
    proxies.forEach(p => this.deregister(p));
  }
}
