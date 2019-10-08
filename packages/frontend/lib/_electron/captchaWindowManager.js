// eslint-disable-next-line import/no-extraneous-dependencies
const { session: Session, Notification } = require('electron');
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

    /**
     * Window options related to the theme of the captcha windows
     */
    this._captchaThemeOpts = {};

    /**
     * Array of created captcha windows
     */
    this._captchaWindows = {};

    this._captchaWindowSessionPairs = new Map();
    this._sessions = new Map();

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
      ({ timestamp }) => differenceInSeconds(new Date(), timestamp) <= 110,
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
        let win;
        Object.values(this._captchaWindows).forEach(group => {
          win = group.find(w => w.webContents.id === ev.sender.id);
        });

        if (win) {
          win.close();
        }
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

  static setProxy(
    win,
    {
      proxyRules,
      proxyBypassRules = '*.google.com,*.gstatic.com,.youtube.com,*.youtube.com,*.ytimg.com,*.doubleclick.net,*.googlevideo.com,https://www.youtube.com,*.ggpht.com,*.com',
    },
  ) {
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
      let check;
      Object.values(this._captchaWindows).forEach(group => {
        check = group.find(win => win.webContents.id === ev.sender.id);
      });
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
  async startHarvesting(runnerId, sitekey, host) {
    this._harvestStatus = {
      state: HARVEST_STATES.ACTIVE,
      runnerId,
      sitekey,
      host,
    };

    // TODO: we should add some logic to spawn more than just one window if lots of tasks are requesting...
    if (!this._captchaWindows[sitekey] || !this._captchaWindows[sitekey].length) {
      this.spawnCaptchaWindow();
    } else {
      await Promise.all(
        Object.values(this._captchaWindows[sitekey]).map(async (win, idx) => {
          await new Promise(resolve => setTimeout(resolve, idx * 250));
          win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, sitekey, host);
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
    // TODO: this should be sitekey specific...
    Object.values(this._captchaWindows).forEach(group =>
      group.map(win => win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey, host)),
    );
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
      runnerId: null,
      siteKey: null,
      host: null,
    };
    // TODO: this should be sitekey specific...
    Object.values(this._captchaWindows).forEach(group =>
      group.map(win => win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey, host)),
    );
  }

  /**
   * Get Captcha
   *
   * Return the next valid, available captcha from the queue
   */
  getNextCaptcha(sitekey) {
    return this._tokenQueue.next(sitekey);
  }

  /**
   * Create a captcha window and show it
   */
  spawnCaptchaWindow(options = {}) {
    const { state, runnerId, sitekey, host } = this._harvestStatus;

    if (!this._captchaWindows[sitekey]) {
      this._captchaWindows[sitekey] = [];
    }

    // Prevent more than 5 windows from spawning per sitekey
    if (this._captchaWindows[sitekey].length >= 5) {
      return null;
    }
    if (!this._context.captchaServerManager.isRunning) {
      console.log('[DEBUG]: Starting captcha server');
      this._context.captchaServerManager.start();
    }

    let session = null;
    // eslint-disable-next-line no-restricted-syntax
    for (const s of this._sessions.values()) {
      if (!s.inUse) {
        session = s;
        session.inUse = true;
        this._sessions.set(session.id, session);
        break;
      }
    }
    // Store background color if it is passed so we get the latest background color passed
    if (options.backgroundColor) {
      this._captchaThemeOpts.backgroundColor = options.backgroundColor;
    }
    console.log(`[DEBUG]: Session for captcha window: %j`, session);
    const win = createCaptchaWindow(
      { ...options, ...this._captchaThemeOpts },
      { session: session.session },
    );
    win.webContents.session.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
      '*/*',
    );
    const winId = win.id;
    const webContentsId = win.webContents.id;

    this._captchaWindows[sitekey].push(win);
    this._captchaWindowSessionPairs.set(winId, session.id);
    CaptchaWindowManager.setProxy(win, {
      proxyRules: `http://127.0.0.1:${this._context.captchaServerManager.port}`,
      proxyBypassRules: '.google.com,.gstatic.com,.youtube.com',
    });
    win.loadURL(host || urls.get('captcha'));
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
        win.webContents.openDevTools();
      }

      win.show();
    });

    win.webContents.session.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.google.com, https://*.gstatic.com'] },
      (details, callback) =>
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            DNT: 1,
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
            'Content-Language': 'en-US,en;q=0.9',
          },
        }),
    );

    win.webContents.once('did-finish-load', () => {
      CaptchaWindowManager.setProxy(win, {});

      // If we are actively harvesting, start harvesting on the new window as well
      if (state === HARVEST_STATES.ACTIVE) {
        win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, sitekey, host);
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
      this._captchaWindows[sitekey] = this._captchaWindows[sitekey].filter(w => w.id !== winId);

      const sessionId = this._captchaWindowSessionPairs.get(winId);
      const s = this._sessions.get(sessionId);
      this._captchaWindowSessionPairs.delete(winId);
      this._sessions.set(s.id, {
        id: s.id,
        session: s.session,
        inUse: false,
      });
      const ytWin = this._youtubeWindows[webContentsId];
      if (ytWin) {
        // Close youtube window
        delete this._youtubeWindows[webContentsId];
        ytWin.close();
      }

      if (!Object.values(this._captchaWindows).length) {
        // Close the server
        console.log('[DEBUG]: Stopping captcha server...');
        this._context.captchaServerManager.stop();
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

  generateSessions(persist = true) {
    // get sessions (or create new ones)
    for (let i = 0; i < 5; i += 1) {
      const session = persist ? `persist:${i}` : i;
      this._sessions.set(i, {
        id: i,
        session: Session.fromPartition(session),
        inUse: false,
      });
    }
  }

  spawnYoutubeWindow(parentId, parentSession) {
    // Use parent session to link the two windows together
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
    if (!Object.values(this._captchaWindows).length) {
      return;
    }
    console.log('[DEBUG]: Closing all captcha windows...');
    Object.values(this._captchaWindows).forEach(group => group.map(w => w.close()));
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

    Object.values(this._captchaWindows).forEach(group =>
      group.map(w => w.webContents.send(IPCKeys.ChangeTheme, this._captchaThemeOpts)),
    );
  }

  /**
   * Clears the storage data and cache for the session
   */
  _onRequestEndSession(ev) {
    ev.sender.session.flushStorageData();
    ev.sender.session.clearStorageData();
    ev.sender.session.clearCache(() => {});
    // close the youtube window if it exists
    const win = this._youtubeWindows[ev.sender.id];
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
    if (this._tokenQueue.backlogLength === 0 && state === HARVEST_STATES.SUSPEND) {
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
    sitekey = 'unattached',
    host = 'http://checkout.shopify.com',
  ) {
    // Store the new token
    this._tokenQueue.insert(sitekey, {
      token,
      sitekey,
      host,
      timestamp: new Date(),
    });

    if (this._tokenQueue.backlogLength >= MAX_HARVEST_CAPTCHA_COUNT) {
      console.log('[DEBUG]: Token Queue is greater than max, suspending...');
      this.suspendHarvesting(runnerId, sitekey);
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
    const win = Object.values(this._captchaWindows).map(group => group.find(w => w.id === winId));
    CaptchaWindowManager.setProxy(win, { proxyRules: CaptchaWindowManager.formatProxy(proxy) });
  }
}

module.exports = CaptchaWindowManager;
