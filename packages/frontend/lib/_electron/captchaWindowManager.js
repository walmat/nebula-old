/* eslint-disable no-restricted-syntax */
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
    this._captchaWindows = {};
    this._sessions = {};

    /**
     * Map of created youtube windows
     *
     * Associated with a created captcha window
     */
    this._youtubeWindows = {};

    /**
     * Async Queues to maange tokens
     */
    this._tokenQueue = {};

    /**
     * Id for check token interval
     *
     * Prevents creating multiple token checkers
     */
    this._checkTokenIntervalId = null;

    /**
     * Current Harvest State
     */
    this._harvestStatus = {};

    this.validateSender = this.validateSender.bind(this);

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
        const winToClose = Object.values(this._captchaWindows)  // Array of captcha window arrays: [[win, ...], [win, ...]]
          .flat()                                               // Flatten to a single array of captcha windows: [win, win, ...]
          .find(win => win.webContents.id === ev.sender.id);    // Find the first window that matches the sender (should only be 1 max)
        // Close window if it is found
        if (winToClose) {
          winToClose.close()
        }
      }),
    );

    if (nebulaEnv.isDevelopment()) {
      context.ipc.on('debug', (ev, type, sitekey) => {
        const tokenQueue = this._tokenQueue[sitekey] || {};
        const status = this._harvestStatus[sitekey] || {};
        switch (type) {
          case 'viewCwmQueueStats': {
            ev.sender.send(
              'debug',
              type,
              `Queue Line Length: ${tokenQueue.lineLength}, Backlog Length: ${tokenQueue.backlogLength}`,
            );
            break;
          }
          case 'viewCwmHarvestState': {
            ev.sender.send('debug', type, `State: ${status.state}`);
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

  static async setProxy(win, { proxyRules }) {
    if (win) {
      await win.webContents.session.setProxy({
        proxyRules,
        proxyBypassRules: '',
      });

      const proxy = await win.webContents.session.resolveProxy('https://google.com');
      console.log('[DEBUG]: Proxy for window %s set to: %s', win.id, proxy);
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
      const check = Object.values(this._captchaWindows)
        .flat()
        .find(win => win.webContents.id === ev.sender.id);
      if (check && !check.isDestroyed()) {
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
    if (!this._captchaWindows[sitekey]) {
      this._captchaWindows[sitekey] = [];
    }

    this._harvestStatus[sitekey] = {
      state: HARVEST_STATES.ACTIVE,
      runnerId,
      sitekey,
      host,
    };

    if (this._captchaWindows[sitekey].length === 0) {
      await this.spawnCaptchaWindow({ runnerId, sitekey, host });
    } else {
      this._captchaWindows[sitekey].forEach(win =>
        win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, sitekey, host),
      );
    }
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  suspendHarvesting(runnerId, sitekey, host) {
    this._harvestStatus[sitekey] = {
      state: HARVEST_STATES.SUSPEND,
      runnerId,
      sitekey,
      host,
    };
    (this._captchaWindows[sitekey] || []).forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, sitekey, host);
    });
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  stopHarvesting(runnerId, sitekey, host) {
    this._harvestStatus = {
      state: HARVEST_STATES.IDLE,
      runnerId,
      sitekey,
      host,
    };
    (this._captchaWindows[sitekey] || []).forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, sitekey, host);
    });
  }

  /**
   * Get Captcha
   *
   * Return the next valid, available captcha from the queue
   */
  getNextCaptcha(sitekey) {
    if (!this._tokenQueue[sitekey]) {
      this._tokenQueue[sitekey] = new AsyncQueue();

      this._tokenQueue[sitekey].addExpirationFilter(
        ({ timestamp }) => differenceInSeconds(new Date(), timestamp) <= 120,
        1000,
        this._generateTokenExpirationUpdateCallback(sitekey),
        this,
      );
    }
    return this._tokenQueue[sitekey].next();
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

    const { host, sitekey, runnerId } = options;

    if (!this._harvestStatus[sitekey]) {
      this._harvestStatus[sitekey] = {
        state: HARVEST_STATES.IDLE,
        runnerId,
        sitekey,
        host,
      };
    }

    if (!this._captchaWindows[sitekey]) {
      this._captchaWindows[sitekey] = [];
    }

    const { state } = this._harvestStatus[sitekey];

    // Prevent more than 5 windows from spawning
    if (this._captchaWindows[sitekey].length >= 5) {
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

    win.loadURL(host);

    this._captchaWindows[sitekey].push(win);
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
        win.webContents.openDevTools();
      }

      win.show();
    });

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
      this._captchaWindows[sitekey] = (this._captchaWindows[sitekey] || []).filter(
        w => w.id !== winId,
      );

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
    if (Object.keys(this._captchaWindows).length === 0) {
      return;
    }

    console.log('[DEBUG]: Closing all captcha windows...');
    Object.values(this._captchaWindows).flat().forEach(win => win.close());
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
    Object.values(this._captchaWindows).flat()
      .forEach(win => win.webContents.send(IPCKeys.ChangeTheme, this._captchaThemeOpts));
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
  _generateTokenExpirationUpdateCallback(key) {
    return () => {
      const { state, runnerId, sitekey, host } = this._harvestStatus[key];
      if (
        this._tokenQueue[key].backlogLength < MAX_HARVEST_CAPTCHA_COUNT &&
        state === HARVEST_STATES.SUSPEND
      ) {
        console.log('[DEBUG]: Resuming harvesters...');
        this.startHarvesting(runnerId, sitekey, host);
      }
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
    if (!this._tokenQueue[sitekey]) {
      this._tokenQueue[sitekey] = new AsyncQueue();

      this._tokenQueue[sitekey].addExpirationFilter(
        ({ timestamp }) => differenceInSeconds(new Date(), timestamp) <= 120,
        1000,
        this._generateTokenExpirationUpdateCallback(sitekey),
        this,
      );
    }

    // Store the new token
    this._tokenQueue[sitekey].insert({
      token,
      sitekey,
      host,
      timestamp: new Date(),
    });

    if (this._tokenQueue[sitekey].backlogLength >= MAX_HARVEST_CAPTCHA_COUNT) {
      console.log('[DEBUG]: Token Queue is greater than max, suspending...');
      this.suspendHarvesting(runnerId, sitekey, host);
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
    const win = Object.values(this._captchaWindows).flat().find(w => w.id === winId);

    if (win) {
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

      CaptchaWindowManager.setProxy(win, {
        proxyRules: CaptchaWindowManager.formatProxy(proxy),
      });
    }
  }
}

module.exports = CaptchaWindowManager;
