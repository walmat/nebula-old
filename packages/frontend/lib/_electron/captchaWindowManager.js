const moment = require('moment');

const IPCKeys = require('../common/constants');

// TODO: Should we move this to the constants file?
const HARVEST_STATE = {
  IDLE: 'idle',
  ACTIVE: 'active',
};

class CaptchaWindowManager {
  /**
   * Check if given token is valid
   *
   * Tokens are invalid if they have exceeded their lifespan
   * of 110 seconds. Use moment to check the timestamp
   */
  static isTokenValid({ timestamp }) {
    return moment().diff(moment(timestamp), 'seconds') <= 110;
  }

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
     * Map of harvested tokens based on sitekey
     */
    this._tokens = {};

    /**
     * Id for check token interval
     *
     * Prevents creating multiple token checkers
     */
    this._checkTokenIntervalId = null;

    /**
     * Current Harvest State
     */
    this._harvestState = HARVEST_STATE.IDLE;

    this.validateSender = this.validateSender.bind(this);

    // Attach IPC handlers
    context.ipc.on(IPCKeys.RequestLaunchYoutube, this.validateSender(this._onRequestLaunchYoutube));
    context.ipc.on(IPCKeys.RequestEndSession, this.validateSender(this._onRequestEndSession));
    context.ipc.on(IPCKeys.HarvestCaptcha, this.validateSender(this._onHarvestToken));
    context.ipc.on(IPCKeys.RequestRefresh, this.validateSender(ev => ev.sender.reload()));
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
      if (check) {
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
  startHarvesting(runnerId, siteKey) {
    this._harvestState = HARVEST_STATE.ACTIVE;
    if (this._captchaWindows === 0) {
      // TODO: create captcha window...
    }

    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StartHarvestCaptcha, runnerId, siteKey);
    });
  }

  /**
   * Stop Harvesting
   *
   * Tell all captcha windows to stop harvesting and set the
   * harvest state to 'idle'
   */
  stopHarvesting(runnerId, siteKey) {
    this._captchaWindows.forEach(win => {
      win.webContents.send(IPCKeys.StopHarvestCaptcha, runnerId, siteKey);
    });
    this._harvestState = HARVEST_STATE.IDLE;
  }

  _checkTokens() {
    let tokensTotal = 0;
    // Iterate through all sitekey token lists
    Object.keys(this._tokens).forEach(siteKey => {
      // Filter out invalid tokens
      this._tokens[siteKey] = this._tokens[siteKey].filter(CaptchaWindowManager.isTokenValid);
      tokensTotal += this._tokens[siteKey].length;
    });

    // Clear the interval if there are no more tokens
    if (this._checkTokenIntervalId && tokensTotal === 0) {
      clearInterval(this._checkTokenIntervalId);
      this._checkTokenIntervalId = null;
    }
  }

  /**
   * Clears the storage data and cache for the session
   */
  _onRequestEndSession(ev) {
    // TODO: Implement
  }

  /**
   * Harvest Token
   *
   * Harvest the token and store it with other tokens sharing the same site key.
   * Start the check token interval if it hasn't started already. This will
   * periodically check and remove expired tokens
   */
  _onHarvestToken(_, __, token, siteKey = 'unattached', host) {
    if (!this._tokens[siteKey]) {
      // Create token array if it hasn't been created for this sitekey
      this._tokens[siteKey] = [];
    }
    // Store the new token
    this._tokens[siteKey].push({
      token,
      siteKey,
      host,
      timestamp: moment(),
    });
    // Start the check token interval if it hasn't been started
    if (this._checkTokenIntervalId === null) {
      this._checkTokenIntervalId = setInterval(this._checkTokens.bind(this), 1000);
    }
  }

  /**
   * Launch Youtube Window
   *
   * Check if the captcha window already has a youtube window
   * and focus it. If no window is present, create a new
   * youtube window and focus it
   */
  async _onRequestLaunchYoutube(ev) {
    // Check if win already exists. if not, create it
    let win = this._youtubeWindows[ev.sender.id];
    if (!win) {
      win = await this._context.windowManager.createNewWindow('youtube');
      this._youtubeWindows[ev.sender.id] = win;

      win.webContents.on('destroyed', () => {
        this._youtubeWindows[ev.sender.id] = null;
      });
    }

    // Focus the window
    win.focus();
  }
}

module.exports = CaptchaWindowManager;
