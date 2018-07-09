const { ipcRenderer } = require('electron');

// Wrap ipcRenderer call
const _sendEvent = (channel, msg) => {
  ipcRenderer.send(channel, msg);
};

// Send a quit window event
const _quit = () => {
  _sendEvent('window-event', 'quit');
};

// Send a launchYoutube window event
const _launchYoutube = () => {
  _sendEvent('window-event', 'launchYoutube');
};

const _launchHarvester = () => {
  _sendEvent('window-event', 'launchHarvester');
};

const _endSession = () => {
  _sendEvent('window-event', 'endSession');
};

const _harvest = (token) => {
  _sendEvent('harvest', token);
};

const _refresh = (window) => {
    _sendEvent('refresh', window);
};

const _updateHistory = () => {
    setInterval(() => {
        for (let i = 0; i < captchas.length; i++) {

            // send the updated time for us to keep track of
            _sendEvent('updateHistory', {
                time: 110 - moment().diff(moment(captchas[i].ts), 'seconds'),
                token: captchas[i].token
            });

            // remove captcha if expired
            if (moment().diff(moment(captchas[i].ts), 'seconds') > 110) {
                _sendEvent('captchaExpired', captchas[i]);
                captchas = _.reject(captchas, (el) => {
                    return el.token === captchas[i].token;
                });
            }
        }
    }, 1000);
};

// Once the process is loaded, create api bridge
process.once('loaded', () => {
  window.Bridge = window.Bridge || {};

  /* BRIDGED EVENTS */
  window.Bridge.launchYoutube = _launchYoutube;
  window.Bridge.launchHarvester = _launchHarvester;
  window.Bridge.refresh = _refresh;
  window.Bridge.updateHistory = _updateHistory;
  window.Bridge.harvest = _harvest;
  window.Bridge.endSession = _endSession;
  window.Bridge.quit = _quit;
});
