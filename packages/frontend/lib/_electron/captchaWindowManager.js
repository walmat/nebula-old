// eslint-disable-next-line import/no-extraneous-dependencies
const { session: Session } = require('electron');
const { differenceInSeconds } = require('date-fns');

const { createCaptchaWindow, createYouTubeWindow, urls } = require('./windows');
const nebulaEnv = require('./env');
const IPCKeys = require('../common/constants');
const AsyncQueue = require('../common/classes/asyncQueue');

nebulaEnv.setUpEnvironment();

// TODO: Should we move this to the constants file?
const HARVEST_STATE = {
  IDLE: 'idle',
  SUSPEND: 'suspend',
  ACTIVE: 'active',
};

const MAX_HARVEST_CAPTCHA_COUNT = 5;

class CaptchaWindowManager {
  constructor(context) {
    /**
     * Application Context
     */
    this._context = context;

    /**
     * Array of created captcha windows
     */
    this._captchaWindows = [];

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
      state: HARVEST_STATE.IDLE,
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
              `Queue Line Length: ${this._tokenQueue.lineLength}, Backlog Length: ${
                this._tokenQueue.backlogLength
              }`,
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

  static setProxy(win, { proxyRules, proxyBypassRules = '' }) {
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
  async startHarvesting(runnerId, siteKey) {
    this._harvestStatus = {
      state: HARVEST_STATE.ACTIVE,
      runnerId,
      siteKey,
    };
    if (this._captchaWindows.length === 0) {
      this.spawnCaptchaWindow();
    } else {
      await Promise.all(
        this._captchaWindows.map(async (win, idx) => {
          await new Promise(resolve => setTimeout(resolve, idx * 250));
          win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey);
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
  suspendHarvesting(runnerId, siteKey) {
    this._harvestStatus = {
      state: HARVEST_STATE.SUSPEND,
      runnerId,
      siteKey,
    };
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey);
    });
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  stopHarvesting(runnerId, siteKey) {
    this._harvestStatus = {
      state: HARVEST_STATE.IDLE,
      runnerId: null,
      siteKey: null,
    };
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey);
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

  /**
   * Create a captcha window and show it
   */
  spawnCaptchaWindow(options = {}) {
    // Prevent more than 5 windows from spawning
    if (this._captchaWindows.length >= 5) {
      return null;
    }
    if (!this._context.captchaServerManager.isRunning) {
      console.log('[DEBUG]: Starting captcha server');
      this._context.captchaServerManager.start();
    }
    // Create window with randomly generated session partition
    // const session = Session.fromPartition(shortid.generate());
    const session = Session.defaultSession;
    const win = createCaptchaWindow(options, { session });
    win.webContents.session.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
      '*/*',
    );
    const winId = win.id;
    const webContentsId = win.webContents.id;
    this._captchaWindows.push(win);
    CaptchaWindowManager.setProxy(win, {
      proxyRules: `http://127.0.0.1:${this._context.captchaServerManager.port}`,
      proxyBypassRules: '.google.com,.gstatic.com',
    });
    win.loadURL('http://checkout.shopify.com');
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
        win.webContents.openDevTools();
      }

      win.show();
    });

    win.webContents.once('did-finish-load', () => {
      CaptchaWindowManager.setProxy(win, '');
      // If we are actively harvesting, start harvesting on the new window as well
      const { state, runnerId, siteKey } = this._harvestStatus;
      if (state === HARVEST_STATE.ACTIVE) {
        win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey);
      }
    });

    const handleClose = () => {
      if (nebulaEnv.isDevelopment()) {
        console.log(`[DEBUG]: Window was closed, id = ${winId}`);
      }
      this._captchaWindows = this._captchaWindows.filter(w => w.id !== winId);
      const ytWin = this._youtubeWindows[webContentsId];
      if (ytWin) {
        // Close youtube window
        delete this._youtubeWindows[webContentsId];
        ytWin.close();
      }

      if (this._captchaWindows.length === 0) {
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
    if (this._captchaWindows.length === 0) {
      return;
    }
    console.log('[DEBUG]: Closing all captcha windows...');
    this._captchaWindows.forEach(win => {
      win.close();
    });
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
    const { state, runnerId, siteKey } = this._harvestStatus;
    if (this._tokenQueue.backlogLength === 0 && state === HARVEST_STATE.SUSPEND) {
      console.log('[DEBUG]: Resuming harvesters...');
      this.startHarvesting(runnerId, siteKey);
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
      this.suspendHarvesting(runnerId, siteKey);
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
    CaptchaWindowManager.setProxy(win, { proxyRules: CaptchaWindowManager.formatProxy(proxy) });
  }
}

module.exports = CaptchaWindowManager;
