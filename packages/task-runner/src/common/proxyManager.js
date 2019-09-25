/* eslint-disable no-restricted-syntax */
const hash = require('object-hash');
const shortid = require('shortid');

class ProxyManager {
  get proxies() {
    return this._proxies;
  }

  constructor(logger) {
    this._logger = logger;
    this._proxies = new Map();
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
   * not been added already. Once added, task runners are able to reserve
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
      id = shortid.generate();
    } while (this._proxies.get(id));

    const formattedProxy = this.format(proxy);

    this._logger.debug('Adding proxy: %s', formattedProxy);

    this._proxies.set(id, {
      id,
      hash: proxyHash,
      raw: proxy,
      proxy: formattedProxy,
      platforms: {},
      use: {},
    });
    this._logger.debug('Proxy Added with id %s', id);
  }

  /**
   * Deregister a Proxy
   *
   * This method removes a given proxy from the availability pool, but does
   * not stop the proxy from being used if already in use. A task runner
   * that has reserved this proxy will continue to use it until the task
   * stops or until the task runner attempts to swap the proxy.
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
    this._logger.debug('Proxy found with hash %s. Removing now', proxyHash);
    this._proxies.delete(stored.id);
    this._logger.debug('Proxy removed with id %s', stored.id);
  }

  /**
   * Reserve a proxy
   *
   * @param {String} id the id of the runner for whom the proxy will be reserved
   * @param {String} site the site to reserve the proxy for
   * @param {String} wait whether or not this method should wait for an open proxy
   * @param {Number} timeout the recursive call limit on proxy reservations
   */
  async reserve(id, site, platform, wait = false, timeout = 5) {
    let newTimeout = timeout;
    if (!timeout || Number.isNaN(timeout) || timeout < 0) {
      // Force wait limit to be 0 if we have an invalid parameter value passed in
      newTimeout = 0;
    }
    this._logger.debug(
      'Reserving proxy for runner %s for site %s... Looking through %d proxies',
      id,
      site,
      this._proxies.size,
    );
    let proxy = null;

    for (const p of this._proxies.values()) {
      this._logger.debug(
        '%s:\n\n Platform predicate: %j, Used predicate: %j',
        p.proxy,
        p.platforms[platform],
        p.use[site],
      );
      if (!p.use[site] && !p.platforms[platform]) {
        proxy = p;
        // immediately remove the proxy from the list
        this._proxies.delete(proxy.id);
        // set it to in use
        proxy.use[site] = true;
        proxy.platforms[platform] = true;
        // push the proxy back onto the end of the stack
        this._proxies.set(proxy.id, proxy);
        this._logger.debug('Returning proxy: %s', proxy.proxy);
        return proxy;
      }
    }
    if (!wait || newTimeout === 0) {
      this._logger.debug('Not waiting for open proxy, returning null');
      return null;
    }
    this._logger.debug('All proxies are reserved, waiting for open proxy...');
    return new Promise(resolve => {
      setTimeout(
        async () => resolve(await this.reserve(id, site, platform, wait, newTimeout - 1)),
        this.retry,
      ); // wait 1s then try again (should we change this timeout to something smaller?)
    });
  }

  /**
   * Release a proxy
   *
   * @param {String} runnerId the id of the runner this proxy is being released from
   * @param {String} proxyId the id of the proxy to release
   */
  async release(id, site, platform, proxyId) {
    this._logger.debug('Releasing proxy %s for runner %s on site %s...', proxyId, id, site);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.debug('No proxy found, skipping release');
      return;
    }
    // otherwise, just free up the use list
    delete proxy.use[site];
    delete proxy.platforms[platform];
    this._logger.debug('Released Proxy %s', proxyId);
  }

  /**
   * Swap a proxy for a runner
   *
   * This method swaps a proxy for a given runner. If the proxy needs to
   * banned, that is done as well. A fresh proxy is returned for further
   * use.
   *
   * @param {String} runnerId the runner who needs the proxy
   * @param {String} proxyId the old proxy to release
   * @param {String} site the site the proxy is banned
   * @param {bool} shouldBan whether the old proxy should be banned
   */
  async swap(id, proxyId, site, platform) {
    let shouldRelease = true;

    const oldProxy = this._proxies.get(proxyId);

    if (!oldProxy) {
      this._logger.debug('No old proxy found, skipping release');
      shouldRelease = false;
    }

    this._logger.debug('Attempting to swap: %j', oldProxy ? oldProxy.proxy : null);

    // Attempt to reserve a proxy first before releasing the old one
    const newProxy = await this.reserve(id, site, platform);

    this._logger.debug(
      'Swapped old proxy: %s \n Returned new proxy: %s',
      oldProxy ? oldProxy.proxy : null,
      newProxy ? newProxy.proxy : null,
    );

    // Check if we need to release and ban the old proxy
    if (shouldRelease) {
      this._logger.debug('Releasing old proxy... %s', oldProxy.proxy);

      await this.release(id, site, platform, proxyId, true);
      // await this.ban(id, site, proxyId, shouldBan);
    }

    if (!newProxy) {
      this._logger.debug('No new proxy available, skipping release/ban');
      return null;
    }

    this._logger.debug('New proxy: %j', newProxy.proxy);
    // Return the new reserved proxy
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

module.exports = ProxyManager;
