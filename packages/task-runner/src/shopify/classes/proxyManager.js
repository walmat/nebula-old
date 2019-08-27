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
    this.timeout = 120000; // used for soft bans
    this.retry = 10; // retry delay for swapping
  }

  format(rawData) {
    this._logger.silly('Formatting proxy data %s...', rawData);
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
    this._logger.silly('Registering proxy...');
    let id;
    const proxyHash = hash(proxy);
    for (const p of this._proxies.values()) {
      if (p.hash.includes(proxyHash)) {
        this._logger.silly('Proxy already exists with hash %s! proxy not added', proxyHash);
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
      ban: {},
      use: {},
    });
    this._logger.silly('Proxy Added with id %s', id);
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
    this._logger.silly('Deregistering proxy...');
    const proxyHash = hash(proxy);
    let stored = null;
    for (const p of this._proxies.values()) {
      if (p.hash === proxyHash) {
        stored = p;
        break;
      }
    }

    if (!stored) {
      this._logger.silly('Proxy with hash %s not found! Skipping removal', proxyHash);
      return;
    }
    this._logger.debug('Proxy found with hash %s. Removing now', proxyHash);
    this._proxies.delete(stored.id);
    this._logger.silly('Proxy removed with id %s', stored.id);
  }

  /**
   * Reserve a proxy
   *
   * @param {String} id the id of the runner for whom the proxy will be reserved
   * @param {String} site the site to reserve the proxy for
   * @param {String} wait whether or not this method should wait for an open proxy
   * @param {Number} timeout the recursive call limit on proxy reservations
   */
  async reserve(id, site, wait = false, timeout = 5) {
    let newTimeout = timeout;
    if (!timeout || Number.isNaN(timeout) || timeout < 0) {
      // Force wait limit to be 0 if we have an invalid parameter value passed in
      newTimeout = 0;
    }
    this._logger.silly(
      'Reserving proxy for runner %s for site %s... Looking through %d proxies',
      id,
      site,
      this._proxies.size,
    );
    let proxy = null;

    for (const p of this._proxies.values()) {
      this._logger.debug(
        '%s: \n\n Ban predicate: %j, Used predicate: %j, Conditional: %s',
        p.proxy,
        p.ban[site],
        p.use[site],
        !p.use[site] && (!p.ban[site] || p.ban[site] === 0),
      );
      if (!p.use[site] && (!p.ban[site] || p.ban[site] === 0)) {
        proxy = p;
        // immediately remove the proxy from the list
        this._proxies.delete(proxy.id);
        // set it to in use
        proxy.use[site] = true;
        // push the proxy back onto the end of the stack
        this._proxies.set(proxy.id, proxy);
        this._logger.silly('Returning proxy: %s', proxy.id);
        return proxy;
      }
    }
    if (!wait || newTimeout === 0) {
      this._logger.silly('Not waiting for open proxy, returning null');
      return null;
    }
    this._logger.silly('All proxies are reserved, waiting for open proxy...');
    return new Promise(resolve => {
      setTimeout(() => resolve(this.reserve(id, site, wait, newTimeout - 1)), this.retry); // wait for 1 sec, then try again // TODO should we change this timeout to something smaller?
    });
  }

  /**
   * Release a proxy
   *
   * @param {String} runnerId the id of the runner this proxy is being released from
   * @param {String} proxyId the id of the proxy to release
   */
  release(id, site, proxyId, force = false) {
    this._logger.silly('Releasing proxy %s for runner %s on site %s...', proxyId, id, site);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.silly('No proxy found, skipping release');
      return;
    }
    // if the application is forced closed, force the proxy list to be freed up
    if (force) {
      delete proxy.ban[site];
    }
    // otherwise, just free up the use list
    delete proxy.use[site];
    this._logger.silly('Released Proxy %s', proxyId);
  }

  /**
   * Ban a proxy
   *
   * @param {String} runnerId the id of the runner
   * @param {String} site url of the site to ban on
   * @param {String} proxyId the id of the proxy to ban
   * @param {Number} shouldBan 0 = just swap, 1 = soft ban, 2 = hard ban
   */
  ban(id, site, proxyId, shouldBan = 0) {
    this._logger.silly('Banning proxy %s for runner %s on site %s ...', proxyId, id, site);
    const proxy = this._proxies.get(proxyId);
    if (!proxy) {
      this._logger.silly('No proxy found, skipping ban');
      return;
    }

    delete proxy.use[site];
    proxy.ban[site] = shouldBan;
    this._logger.debug('Ban predicate: %j, Used predicate: %j', proxy.ban[site], proxy.use[site]);
    this.release(id, site, proxy.id, true); // release no matter what now!
    // if (proxy.ban[site] === 1) {
    //   // for a soft ban, just timeout the proxy for a couple minutes
    //   this._logger.silly('Banned Proxy %s', proxyId);
    //   setTimeout(() => {
    //     // reset the proxy by removing the ban and opening it up again
    //     this._logger.debug('Freeing up ban predicate for %s', proxy.proxy);
    //     this.release(id, site, proxy.id, true);
    //   }, this.timeout);
    // } else if (proxy.ban[site] === 2) {
    //   // delete the proxy from the list if we've hard banned it
    //   this._proxies.delete(proxyId);
    // }
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
  async swap(id, proxyId, site, shouldBan = 0) {
    let shouldRelease = true;

    const oldProxy = this._proxies.get(proxyId);

    if (!oldProxy) {
      this._logger.silly('No proxy found, skipping release/ban');
      shouldRelease = false;
    }

    this._logger.debug('Attempting to swap: %j', oldProxy ? oldProxy.proxy : null);

    // Attempt to reserve a proxy first before releasing the old one
    const newProxy = await this.reserve(id, site);

    if (!newProxy) {
      this._logger.silly('No new proxy available, skipping release/ban');
      return null;
    }

    this._logger.debug(
      'Swapped old proxy: %s \n Returned new proxy: %s',
      oldProxy ? oldProxy.proxy : null,
      newProxy.proxy,
    );

    // Check if we need to ban the old proxy
    this._logger.debug('Should ban old proxy?: %s', shouldBan);
    // if (shouldBan > 0) {
    this._logger.debug('Banning old proxy... %s', oldProxy.proxy);
    this.ban(id, site, proxyId, shouldBan);
    // }

    // Check if we need to release the old proxy
    if (shouldRelease) {
      this._logger.debug('Releasing old proxy... %s', oldProxy.proxy);
      this.release(id, site, proxyId);
    }
    this._logger.silly('New proxy: %j', newProxy.proxy);
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
