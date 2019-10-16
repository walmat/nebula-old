/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
// eslint-disable-next-line import/no-extraneous-dependencies
const { session: Session, Notification, net } = require('electron');
const fs = require('fs');
const Store = require('electron-store');
const Path = require('path');
const { differenceInSeconds } = require('date-fns');

const { createCaptchaWindow, createYouTubeWindow, urls } = require('./windows');
const nebulaEnv = require('./env');
const { IPCKeys, HARVEST_STATES } = require('../common/constants');
const AsyncQueue = require('../common/classes/asyncQueue');

nebulaEnv.setUpEnvironment();

const MAX_HARVEST_CAPTCHA_COUNT = 5;

class CaptchaWindowManager {
  constructor(context) {
    /**
     * Application Context
     */
    this._context = context;

    this._store = new Store();

    /**
     * Window options related to the theme of the captcha windows
     */
    this._captchaThemeOpts = {};

    /**
     * Array of created captcha windows
     */
    this._captchaWindows = [];
    this._sessions = {};

    /**
     * Map of created youtube windows
     *
     * Associated with a created captcha window
     */
    this._youtubeWindows = {};

    /**
     * Async Queue to maange tokens
     */
    this._tokenQueue = new AsyncQueue();

    /**
     * Id for check token interval
     *
     * Prevents creating multiple token checkers
     */
    this._checkTokenIntervalId = null;

    this.testInterval = null;

    /**
     * Current Harvest State
     */
    this._harvestStatus = {
      state: HARVEST_STATES.IDLE,
      runnerId: null,
      siteKey: null,
    };

    this.validateSender = this.validateSender.bind(this);

    this._tokenQueue.addExpirationFilter(
      ({ timestamp }) => differenceInSeconds(new Date(), timestamp) <= 120,
      1000,
      this._handleTokenExpirationUpdate,
      this,
    );

    // Attach IPC handlers
    context.ipc.on(IPCKeys.RequestLaunchYoutube, this.validateSender(this._onRequestLaunchYoutube));
    context.ipc.on(IPCKeys.RequestEndSession, this.validateSender(this._onRequestEndSession));
    context.ipc.on(
      IPCKeys.RequestSaveCaptchaProxy,
      this.validateSender(this._onRequestSaveCaptchaProxy),
    );
    context.ipc.on(IPCKeys.HarvestCaptcha, this.validateSender(this._onHarvestToken));
    context.ipc.on(IPCKeys.RequestRefresh, this.validateSender(ev => ev.sender.reload()));
    context.ipc.on(IPCKeys.RequestCloseAllCaptchaWindows, () => {
      this.closeAllCaptchaWindows();
    });
    context.ipc.on(
      IPCKeys.RequestCloseWindow,
      this.validateSender(ev => {
        // No need to check for `undefined` because `validateSender` has done that for us...
        this._captchaWindows.find(win => win.webContents.id === ev.sender.id).close();
      }),
    );

    if (nebulaEnv.isDevelopment()) {
      context.ipc.on('debug', (ev, type) => {
        switch (type) {
          case 'viewCwmQueueStats': {
            ev.sender.send(
              'debug',
              type,
              `Queue Line Length: ${this._tokenQueue.lineLength}, Backlog Length: ${this._tokenQueue.backlogLength}`,
            );
            break;
          }
          case 'viewCwmHarvestState': {
            ev.sender.send('debug', type, `State: ${this._harvestStatus.state}`);
            break;
          }
          default: {
            break;
          }
        }
      });
    }
  }

  /**
   * Formats the proxy correctly to be used in a request
   * @param {*} input - IP:PORT:USER:PASS || IP:PORT
   * @returns - http://USER:PASS@IP:PORT || http://IP:PORT
   */
  static formatProxy(input) {
    // safeguard for if it's already formatted or in a format we can't handle
    if (!input || input.startsWith('http') || input === 'localhost') {
      return input;
    }
    const data = input.split(':');
    if (data.length === 2) {
      return `http://${data[0]}:${data[1]}`;
    }
    if (data.length === 4) {
      return `http://${data[2]}:${data[3]}@${data[0]}:${data[1]}`;
    }
    return null;
  }

  static setProxy(win, { proxyRules, proxyBypassRules = '*.com' }) {

    console.log(proxyRules);
    if (win) {
      win.webContents.session.setProxy(
        {
          proxyRules,
          proxyBypassRules,
        },
        () => {
          win.webContents.session.resolveProxy('https://google.com', x => {
            console.log('[DEBUG]: Session proxy set to: %j', x);
          });
        },
      );
    }
  }

  /**
   * Validate Sender
   *
   * Validate that the sender is a captcha window before proceeding
   * to the event handler. This prevents non-captcha windows from causing
   * errors if they accidentally send a captcha-window-specific ipc event
   */
  validateSender(handler) {
    return (ev, ...params) => {
      // Check for window to be a captcha windows
      const check = this._captchaWindows.find(win => win.webContents.id === ev.sender.id);
      if (check && !check.isDestroyed()) {
        // call the handler
        handler.apply(this, [ev, ...params]);
      }
    };
  }

  /**
   * Start Harvesting
   *
   * Tell all captcha windows to start harvesting and set the
   * harvest state to 'active'.
   *
   * If no captcha windows are present, one is created
   */
  async startHarvesting(runnerId, siteKey, host) {
    this._harvestStatus = {
      state: HARVEST_STATES.ACTIVE,
      runnerId,
      siteKey,
      host,
    };
    if (this._captchaWindows.length === 0) {
      await this.spawnCaptchaWindow();
    } else {
      await Promise.all(
        this._captchaWindows.map(async win => {
          const currentDomain = new URL(win.webContents.getURL()).hostname;
          const newDomain = new URL(host).hostname;
          if (currentDomain !== newDomain) {
            CaptchaWindowManager.setupIntercept(win);

            win.loadURL('https://accounts.google.com');

            win.webContents.session.webRequest.onBeforeRequest(
              { urls: ['https://myaccount.google.com/*'] },
              (_, callback) => {
                callback({ redirectURL: host });
              },
            );

            win.webContents.on('dom-ready', () => {
              win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey, host);
            });
            return;
          }

          // await new Promise(resolve => setTimeout(resolve, (idx + 1) * 250));
          win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey, host);
        }),
      );
    }
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  suspendHarvesting(runnerId, siteKey, host) {
    this._harvestStatus = {
      state: HARVEST_STATES.SUSPEND,
      runnerId,
      siteKey,
      host,
    };
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey, host);
    });
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  stopHarvesting(runnerId, siteKey, host) {
    this._harvestStatus = {
      state: HARVEST_STATES.IDLE,
      runnerId,
      siteKey,
      host,
    };
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey, host);
    });
  }

  /**
   * Get Captcha
   *
   * Return the next valid, available captcha from the queue
   */
  getNextCaptcha() {
    return this._tokenQueue.next();
  }

  static setupIntercept(win) {
    win.webContents.session.protocol.interceptBufferProtocol('http', (req, callback) => {
      if (/supreme|shopify/i.test(req.url)) {
        const html = fs.readFileSync(urls.get('captcha'), 'utf8');

        callback({
          mimeType: 'text/html',
          data: Buffer.from(html),
        });
      } else {
        const request = net.request(req);
        request.on('response', res => {
          const chunks = [];

          res.on('data', chunk => {
            chunks.push(Buffer.from(chunk));
          });

          res.on('end', async () => {
            const file = Buffer.concat(chunks);
            callback(file);
          });
        });

        if (req.uploadData) {
          req.uploadData.forEach(part => {
            if (part.bytes) {
              request.write(part.bytes);
            } else if (part.file) {
              request.write(fs.readFileSync(part.file));
            }
          });
        }

        request.end();
      }
    });
  }

  /**
   * Create a captcha window and show it
   */
  spawnCaptchaWindow(options = {}) {
    const { state, runnerId, siteKey, host } = this._harvestStatus;
    // Prevent more than 5 windows from spawning
    if (this._captchaWindows.length >= 5) {
      return null;
    }

    let session = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const s of Object.values(this._sessions)) {
      if (s && !s.inUse) {
        session = s;
        break;
      }
    }

    if (session) {
      session.inUse = true;
    }

    // Store background color if it is passed so we get the latest background color passed
    if (options.backgroundColor) {
      this._captchaThemeOpts.backgroundColor = options.backgroundColor;
    }
    console.log(`[DEBUG]: Session for captcha window: %j`, session);
    const win = createCaptchaWindow(
      { ...options, ...this._captchaThemeOpts },
      { session: session ? Session.fromPartition(session.session) : {} },
    );

    CaptchaWindowManager.setupIntercept(win);

    win.webContents.session.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
      '*/*',
    );
    const winId = win.id;
    const webContentsId = win.webContents.id;

    // patch in the window to the session mapping...
    session.window = winId;
    this._sessions[session.id] = session;
    this._store.set('captchaSessions', JSON.stringify(this._sessions));
    console.log(`[DEBUG]: Session for window set %j`, this._sessions[session.id]);

    win.loadURL('https://accounts.google.com');

    win.webContents.session.webRequest.onBeforeRequest(
      { urls: ['https://myaccount.google.com/*'] },
      (_, callback) => {
        callback({ redirectURL: host || 'http://checkout.shopify.com' });
      },
    );

    // win.loadURL(host || 'http://checkout.shopify.com');

    this._captchaWindows.push(win);
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
        win.webContents.openDevTools();
      }

      win.show();
    });

    // win.webContents.session.webRequest.onBeforeSendHeaders(
    //   { urls: ['https://*.google.com, https://*.gstatic.com'] },
    //   (details, callback) =>
    //     callback({
    //       requestHeaders: {
    //         ...details.requestHeaders,
    //         DNT: 1,
    //         'User-Agent':
    //           'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
    //         'Content-Language': 'en-US,en;q=0.9',
    //       },
    //     }),
    // );

    win.webContents.once('did-finish-load', () => {
      const { id: sessionId, proxy } = session;
      console.log(`[DEBUG]: Session for window: ${sessionId}`);

      if (sessionId !== undefined && sessionId !== null) {
        console.log(`[DEBUG]: Proxy ${proxy} for session ${sessionId}`);
        if (proxy) {
          console.log(`[DEBUG]: Setting proxy!`);
          win.webContents.send(IPCKeys.RequestShowProxy, proxy);
          CaptchaWindowManager.setProxy(win, {
            proxyRules: CaptchaWindowManager.formatProxy(proxy),
          });
        } else {
          CaptchaWindowManager.setProxy(win, {});
        }
      } else {
        CaptchaWindowManager.setProxy(win, {});
      }

      // If we are actively harvesting, start harvesting on the new window as well
      if (state === HARVEST_STATES.ACTIVE) {
        win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey, host);
        if (Notification.isSupported()) {
          const sound = nebulaEnv.isDevelopment()
            ? Path.join(__dirname, '../../public/assets/sounds/notification.mp3')
            : Path.join(__dirname, '../../build/assets/sounds/notification.mp3');

          const notif = new Notification({
            title: 'Waiting for captcha',
            silent: false,
            sound,
          });
          notif.show();
        }
      }
    });

    const handleClose = () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`[DEBUG]: Window was closed, id = ${winId}`);
      }
      this._captchaWindows = this._captchaWindows.filter(w => w.id !== winId);

      const { id: sessionId } = Object.values(this._sessions).find(s => s.window === winId);

      console.log(`[DEBUG]: Session for window: ${sessionId}`);

      if (sessionId !== undefined && sessionId !== null) {
        console.log(`[DEBUG]: Removing window ${winId} from session`);
        const s = this._sessions[sessionId];
        this._sessions[sessionId] = {
          id: s.id,
          proxy: s.proxy,
          window: '',
          session: s.session,
          inUse: false,
        };
        this._store.set('captchaSessions', JSON.stringify(this._sessions));
      }

      const ytWin = this._youtubeWindows[webContentsId];
      if (ytWin) {
        // Close youtube window
        delete this._youtubeWindows[webContentsId];
        ytWin.close();
      }
    };

    // Cleanup window if it was destroyed from outside source
    win.webContents.on('destroyed', handleClose);
    win.on('close', () => {
      // Remove destroyed event since we are handling closing here
      win.webContents.removeListener('destroyed', handleClose);

      handleClose();
    });

    return win;
  }

  async freeAllSessions() {
    console.log('Freeing sessions');
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(this._sessions)) {
      const session = this._sessions[key];
      this._sessions[key] = {
        ...session,
        inUse: false,
      };
    }

    this._store.set('captchaSessions', JSON.stringify(this._sessions));
  }

  async generateSessions(persist = true) {
    // get sessions store
    let sessions = this._store.get('captchaSessions');
    if (sessions) {
      try {
        sessions = JSON.parse(sessions);
      } catch (err) {
        // if we have trouble parsing out the sessions, recreate them...
        this._store.delete('captchaSessions');
        for (let i = 0; i < 5; i += 1) {
          this._sessions[i] = {
            id: i,
            proxy: '',
            window: '',
            session: persist ? `persist:${i}` : i,
            inUse: false,
          };
        }

        this._store.set('captchaSessions', JSON.stringify(this._sessions));
      }

      if (sessions && Object.values(sessions).length === 5) {
        this._sessions = sessions;
        await this.freeAllSessions();
      } else {
        // if we have improper length of elements, recreate them...
        this._store.delete('captchaSessions');
        for (let i = 0; i < 5; i += 1) {
          this._sessions[i] = {
            id: i,
            proxy: '',
            window: '',
            session: persist ? `persist:${i}` : i,
            inUse: false,
          };
        }

        this._store.set('captchaSessions', JSON.stringify(this._sessions));
      }
    } else {
      for (let i = 0; i < 5; i += 1) {
        this._sessions[i] = {
          id: i,
          proxy: '',
          window: '',
          session: persist ? `persist:${i}` : i,
          inUse: false,
        };
      }

      this._store.set('captchaSessions', JSON.stringify(this._sessions));
    }
  }

  spawnYoutubeWindow(parentId, parentSession) {
    // Use parent session to link the two windows together
    // TODO: Do we use the same proxy?
    const win = createYouTubeWindow(null, { session: parentSession });
    const winId = win.id;
    this._youtubeWindows[parentId] = win;
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
        win.webContents.openDevTools(); // TODO: do we need this for youtube windows?
      }
      win.show();
    });

    const handleClose = () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`[DEBUG]: Window was closed, id = ${winId}`);
      }
      // remove reference if it still exists
      if (this._youtubeWindows[parentId]) {
        delete this._youtubeWindows[parentId];
      }
    };

    // Cleanup window if it was destroyed from outside source
    win.webContents.on('destroyed', handleClose);
    win.on('close', () => {
      // Remove destroyed event since we are handling closing here
      win.webContents.removeListener('destroyed', handleClose);

      handleClose();
    });
    win.loadURL(urls.get('gmail'));

    return win;
  }

  /**
   * Close all captcha windows
   */
  closeAllCaptchaWindows() {
    // Do nothing if we don't have any captcha windows
    if (this._captchaWindows.length === 0) {
      return;
    }
    console.log('[DEBUG]: Closing all captcha windows...');
    this._captchaWindows.forEach(win => {
      win.close();
    });
  }

  /**
   * Change the theme of captcha windows
   */
  changeTheme(options) {
    this._captchaThemeOpts = {
      ...this._captchaThemeOpts,
      ...options,
    };
    // Update currently opened windows
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.ChangeTheme, this._captchaThemeOpts);
    });
  }

  /**
   * Clears the storage data and cache for the session
   */
  _onRequestEndSession(ev) {
    const winId = ev.sender.id;

    console.log('[DEBUG]: Ending session!');
    ev.sender.session.flushStorageData();
    ev.sender.session.clearStorageData();
    ev.sender.session.clearCache(() => {});

    // close the youtube window if it exists
    const win = this._youtubeWindows[winId];
    if (win) {
      win.close();
    }
  }

  /**
   * Handle Expiration check updates
   *
   * Resume harvesting if it was previously suspended
   * _and_ the number of tokens in the backlog is 0.
   */
  _handleTokenExpirationUpdate() {
    const { state, runnerId, siteKey, host } = this._harvestStatus;
    if (
      this._tokenQueue.backlogLength < MAX_HARVEST_CAPTCHA_COUNT &&
      state === HARVEST_STATES.SUSPEND
    ) {
      console.log('[DEBUG]: Resuming harvesters...');
      this.startHarvesting(runnerId, siteKey, host);
    }
  }

  /**
   * Harvest Token
   *
   * Harvest the token and store it with other tokens sharing the same site key.
   * Start the check token interval if it hasn't started already. This will
   * periodically check and remove expired tokens
   */
  _onHarvestToken(
    _,
    runnerId,
    token,
    siteKey = 'unattached',
    host = 'http://checkout.shopify.com',
  ) {
    // Store the new token
    this._tokenQueue.insert({
      token,
      siteKey,
      host,
      timestamp: new Date(),
    });

    if (this._tokenQueue.backlogLength >= MAX_HARVEST_CAPTCHA_COUNT) {
      console.log('[DEBUG]: Token Queue is greater than max, suspending...');
      this.suspendHarvesting(runnerId, siteKey, host);
    }
  }

  /**
   * Launch Youtube Window
   *
   * Check if the captcha window already has a youtube window
   * and focus it. If no window is present, create a new
   * youtube window and focus it
   */
  _onRequestLaunchYoutube(ev) {
    const { id, session } = ev.sender;
    console.log(`[DEBUG]: Incoming session: %j`, session);
    // Check if win already exists. if not, create it
    let win = this._youtubeWindows[id];
    if (!win) {
      win = this.spawnYoutubeWindow(id, session);
    }
    // Focus the window
    win.focus();
  }

  _onRequestSaveCaptchaProxy(_, winId, proxy) {
    const win = this._captchaWindows.find(w => w.id === winId);

    const { id: sessionId } = Object.values(this._sessions).find(s => s.window === winId);
    console.log(`[DEBUG]: Session for window: ${sessionId}`);

    if (sessionId !== undefined && sessionId !== null) {
      console.log('[DEBUG]: Found session %s Updating proxy...', sessionId);
      const s = this._sessions[sessionId];
      this._sessions[sessionId] = {
        id: s.id,
        window: winId,
        proxy, // save raw proxy, format it later...
        session: s.session,
        inUse: true,
      };

      this._store.set('captchaSessions', JSON.stringify(this._sessions));
    }

    CaptchaWindowManager.setProxy(win, { proxyRules: CaptchaWindowManager.formatProxy(proxy) });
  }
}

module.exports = CaptchaWindowManager;
