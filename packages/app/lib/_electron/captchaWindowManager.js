/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
const {
  session: Session,
  Notification,
  net: { request },
  // eslint-disable-next-line import/no-extraneous-dependencies
} = require('electron');
const fs = require('fs');
const Store = require('electron-store');
const Path = require('path');
const { differenceInSeconds } = require('date-fns');

const { createCaptchaWindow, createYouTubeWindow, urls } = require('./windows');
const nebulaEnv = require('./env');
const { IPCKeys, HARVEST_STATES } = require('../common/constants');
const AsyncQueue = require('../common/classes/asyncQueue');

nebulaEnv.setUpEnvironment();

const MAX_HARVEST_WINDOW_COUNT = 5;
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
    this._checkpointWindows = {};
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
    context.ipc.on(
      IPCKeys.RequestStartHarvestCaptcha,
      this.validateSender(this._onRequestStartHarvest),
    );
    context.ipc.on(IPCKeys.HarvestCaptcha, this.validateSender(this._onHarvestToken));
    context.ipc.on(
      IPCKeys.RequestRefresh,
      this.validateSender(ev => ev.sender.reload()),
    );
    context.ipc.on(IPCKeys.RequestCloseAllCaptchaWindows, () => {
      this.closeAllCaptchaWindows();
    });
    context.ipc.on(
      IPCKeys.RequestCloseWindow,
      this.validateSender(ev => {
        // No need to check for `undefined` because `validateSender` has done that for us...
        let winToClose = Object.values(this._captchaWindows) // Array of captcha window arrays: [[win, ...], [win, ...]]
          .flat() // Flatten to a single array of captcha windows: [win, win, ...]
          .find(win => win.webContents.id === ev.sender.id); // Find the first window that matches the sender (should only be 1 max)

        // Close window if it is found
        if (winToClose) {
          winToClose.close();
          return;
        }

        winToClose = Object.values(this._checkpointWindows) // Array of captcha window arrays: [[win, ...], [win, ...]]
          .flat() // Flatten to a single array of captcha windows: [win, win, ...]
          .find(win => win.webContents.id === ev.sender.id); // Find the first window that matches the sender (should only be 1 max)

        // Close window if it is found
        if (winToClose) {
          winToClose.close();
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
      const check = Object.values(this._checkpointWindows)
        .flat()
        .find(win => win.webContents.id === ev.sender.id);

      const cap = Object.values(this._captchaWindows)
        .flat()
        .find(win => win.webContents.id === ev.sender.id);

      if ((check || cap) && !(check || cap).isDestroyed()) {
        handler.apply(this, [ev, ...params]);
      }
    };
  }

  /**
   * Start Harvesting
   *
   * Tell all `captcha windows` to start harvesting and set the
   * harvest state to 'active'.
   *
   * If no captcha windows are present, one is created
   */
  async startHarvesting(id, sitekey, host, checkpoint) {
    console.log(checkpoint);
    if (checkpoint) {
      if (!this._checkpointWindows[sitekey]) {
        this._checkpointWindows[sitekey] = [];
      }

      this._harvestStatus[sitekey] = {
        state: HARVEST_STATES.ACTIVE,
        id,
        sitekey,
        host,
        checkpoint,
      };

      if (!this._checkpointWindows[sitekey].length) {
        await this.spawnCaptchaWindow({ id, sitekey, host, checkpoint });
      } else {
        Promise.all(
          this._checkpointWindows[sitekey].map(win =>
            win.webContents.send(IPCKeys.StartHarvestCaptcha, id, sitekey, host),
          ),
        );
      }
    } else {
      if (!this._captchaWindows[sitekey]) {
        this._captchaWindows[sitekey] = [];
      }

      this._harvestStatus[sitekey] = {
        state: HARVEST_STATES.ACTIVE,
        id,
        sitekey,
        host,
        checkpoint,
      };

      if (this._captchaWindows[sitekey].length === 0) {
        await this.spawnCaptchaWindow({ id, sitekey, host });
      } else {
        Promise.all(
          this._captchaWindows[sitekey].map(win =>
            win.webContents.send(IPCKeys.StartHarvestCaptcha, id, sitekey, host),
          ),
        );
      }
    }
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  suspendHarvesting(id, sitekey, host) {
    this._harvestStatus[sitekey].state = HARVEST_STATES.SUSPEND;

    const { checkpoint } = this._harvestStatus[sitekey];
    if (checkpoint) {
      Promise.all(
        (this._checkpointWindows[sitekey] || []).map(win =>
          win.webContents.send(IPCKeys.StopHarvestCaptcha, id, sitekey, host),
        ),
      );
    } else {
      Promise.all(
        (this._captchaWindows[sitekey] || []).map(win =>
          win.webContents.send(IPCKeys.StopHarvestCaptcha, id, sitekey, host),
        ),
      );
    }
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  stopHarvesting(id, sitekey, host) {
    this._harvestStatus[sitekey].state = HARVEST_STATES.IDLE;

    const { checkpoint } = this._harvestStatus[sitekey];
    if (checkpoint) {
      Promise.all(
        (this._checkpointWindows[sitekey] || []).map(win =>
          win.webContents.send(IPCKeys.StopHarvestCaptcha, id, sitekey, host),
        ),
      );
    } else {
      Promise.all(
        (this._captchaWindows[sitekey] || []).map(win =>
          win.webContents.send(IPCKeys.StopHarvestCaptcha, id, sitekey, host),
        ),
      );
    }
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
        const _request = request(req);
        _request.on('response', res => {
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
              _request.write(part.bytes);
            } else if (part.file) {
              _request.write(fs.readFileSync(part.file));
            }
          });
        }

        _request.end();
      }
    });
  }

  /**
   * Create a captcha window and show it
   */
  spawnCaptchaWindow(options = {}) {
    const { id, host, sitekey, checkpoint } = options;

    if (!this._harvestStatus[sitekey]) {
      this._harvestStatus[sitekey] = {
        state: HARVEST_STATES.IDLE,
        id,
        sitekey,
        host,
      };
    }

    if (checkpoint) {
      if (!this._checkpointWindows[sitekey]) {
        this._checkpointWindows[sitekey] = [];
      }

      // Prevent more than 5 windows from spawning
      if (this._checkpointWindows[sitekey].length >= MAX_HARVEST_WINDOW_COUNT) {
        return null;
      }
    } else if (!this._captchaWindows[sitekey]) {
      this._captchaWindows[sitekey] = [];

      // Prevent more than 5 windows from spawning for a sitekey
      if (this._captchaWindows[sitekey].length >= MAX_HARVEST_WINDOW_COUNT) {
        return null;
      }
    }

    const { state } = this._harvestStatus[sitekey];

    let session = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const s of Object.values(this._sessions)) {
      if (s && !s.inUse[host]) {
        session = s;
        break;
      }
    }

    if (session) {
      session.inUse[host] = true;
    }

    // Store background color if it is passed so we get the latest background color passed
    if (options.backgroundColor) {
      this._captchaThemeOpts.backgroundColor = options.backgroundColor;
    }

    let win;
    if (checkpoint) {
      console.log(`[DEBUG]: Session for captcha window: %j`, session);
      win = createCaptchaWindow(
        { ...options, ...this._captchaThemeOpts, backgroundColor: '#000' },
        { session: session ? Session.fromPartition(session.session) : {} },
      );
    } else {
      console.log(`[DEBUG]: Session for captcha window: %j`, session);
      win = createCaptchaWindow(
        { ...options, ...this._captchaThemeOpts },
        { session: session ? Session.fromPartition(session.session) : {} },
      );
    }

    CaptchaWindowManager.setupIntercept(win);

    console.log(`[DEBUG]: Detected UA: %j`, win.webContents.session.getUserAgent());

    const winId = win.id;
    const webContentsId = win.webContents.id;

    // patch in the window to the session mapping...
    session.window = winId;
    this._sessions[session.id] = session;
    this._store.set('captchaSessions', JSON.stringify(this._sessions));
    console.log(`[DEBUG]: Session for window set %j`, this._sessions[session.id]);

    win.loadURL(host);

    if (checkpoint) {
      this._checkpointWindows[sitekey].push(win);
    } else {
      this._captchaWindows[sitekey].push(win);
    }
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
        win.webContents.send(IPCKeys.StartHarvestCaptcha, id, sitekey, host);

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

      if (checkpoint) {
        this._checkpointWindows[sitekey] = (this._checkpointWindows[sitekey] || []).filter(
          w => w.id !== winId,
        );
      } else {
        this._captchaWindows[sitekey] = (this._captchaWindows[sitekey] || []).filter(
          w => w.id !== winId,
        );
      }

      const { id: sessionId } = Object.values(this._sessions).find(s => s.window === winId);

      console.log(`[DEBUG]: Session for window: ${sessionId}`);

      if (sessionId !== undefined && sessionId !== null) {
        console.log(`[DEBUG]: Removing window ${winId} from session`);
        delete this._sessions[sessionId].window;
        delete this._sessions[sessionId].inUse[host];
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
      this._sessions[key].inUse = {};
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
            inUse: {},
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
            inUse: {},
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
          inUse: {},
        };
      }

      this._store.set('captchaSessions', JSON.stringify(this._sessions));
    }
  }

  spawnYoutubeWindow(parentId, parentSession) {
    // Use parent session to link the two windows together
    // TODO: Do we use the same proxy?
    const win = createYouTubeWindow(null, { session: parentSession });

    win.webContents.setUserAgent(
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:70.0) Gecko/20100101 Firefox/70.0',
      '*/*',
    );

    console.log(`[DEBUG]: UA set to: `, win.webContents.getUserAgent());

    const winId = win.id;
    this._youtubeWindows[parentId] = win;
    win.on('ready-to-show', () => {
      if (nebulaEnv.isDevelopment() || process.env.NEBULA_ENV_SHOW_DEVTOOLS) {
        console.log(`[DEBUG]: Window was opened, id = ${winId}`);
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
    if (!Object.keys(this._captchaWindows).length && !Object.keys(this._checkpointWindows).length) {
      return;
    }

    console.log('[DEBUG]: Closing all windows...');
    Object.values(this._captchaWindows)
      .flat()
      .forEach(win => win.close());

    Object.values(this._checkpointWindows)
      .flat()
      .forEach(win => win.close());
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
    Object.values(this._captchaWindows)
      .flat()
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
      const { id, sitekey, host, state, checkpoint } = this._harvestStatus[key];
      if (
        this._tokenQueue[key].backlogLength < MAX_HARVEST_CAPTCHA_COUNT &&
        state === HARVEST_STATES.SUSPEND
      ) {
        console.log('[DEBUG]: Resuming harvesters...');
        this.startHarvesting(id, sitekey, host, checkpoint);
      }
    };
  }

  /**
   * Harvest Token
   *
   * Harvest the token and store it with other tokens sharing the same site key.
   * Start the check token interval if it hasn't started already. This will
   * periodically check and remove expired tokens
   */
  _onHarvestToken(_, id, token, sitekey = 'unattached', host = 'http://checkout.shopify.com') {
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
      console.log(
        `[DEBUG]: Token backlog is greater than ${MAX_HARVEST_CAPTCHA_COUNT}, suspending...`,
      );
      this.suspendHarvesting(id, sitekey, host);
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
    let win = Object.values(this._captchaWindows)
      .flat()
      .find(w => w.id === winId);

    if (!win) {
      win = Object.values(this._checkpointWindows)
        .flat()
        .find(w => w.id === winId);
    }

    if (win) {
      const { id: sessionId } = Object.values(this._sessions).find(s => s.window === winId);
      console.log(`[DEBUG]: Session for window: ${sessionId}`);

      if (sessionId !== undefined && sessionId !== null) {
        console.log('[DEBUG]: Found session %s Updating proxy...', sessionId);
        this._sessions[sessionId].proxy = proxy;

        this._store.set('captchaSessions', JSON.stringify(this._sessions));
      }

      CaptchaWindowManager.setProxy(win, {
        proxyRules: CaptchaWindowManager.formatProxy(proxy),
      });
    }
  }
}

module.exports = CaptchaWindowManager;
