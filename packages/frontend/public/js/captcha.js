let _siteKey = '';
let _runnerId = '';
let _started = false;
let _initialized = false;
let _iframe = null;
const _defaultEvtOptions = {
  altKey: false,
  bubbles: true,
  button: 0,
  cancelable: true,
  clientX: 0,
  clientY: 0,
  ctrlKey: false,
  detail: 0,
  metaKey: false,
  relatedTarget: null,
  screenX: 0,
  screenY: 0,
  shiftKey: false,
  type: null,
  view: window,
};

function evtOptionsToArgs(options) {
  return [
    'type',
    'bubbles',
    'cancelable',
    'view',
    'detail',
    'screenX',
    'screenY',
    'clientX',
    'clientY',
    'ctrlKey',
    'altKey',
    'shiftKey',
    'metaKey',
    'button',
    'relatedTarget',
  ].map(key => options[key] || _defaultEvtOptions[key]);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function waitForLoad() {
  if (_iframe) {
    return;
  }
  let iframe = document.querySelector('iframe[role=presentation]');
  while (!iframe) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));
    iframe = document.querySelector('iframe[role=presentation]');
  }
  _iframe = iframe;
}

function simulateEvent(target, evt, destPt, sourcePt, options) {
  const opts = {
    type: evt,
    ...options, // Use given options to override any default options
  };
  const event = target.ownerDocument.createEvent('MouseEvents');
  event.initMouseEvent(...evtOptionsToArgs(opts));
  target.dispatchEvent(event);
}

function simulateClick(sourcePt) {
  if (!_iframe) {
    // iframe isn't loaded yet, so we can't simulate click...
    return;
  }
  const content = _iframe.contentDocument || _iframe.contentWindow.document;

  // Create helper functions
  const randPoint = ({ width, height }) => ({
    x: rand(0, width),
    y: rand(0, height),
  });
  const getByClassName = className => content.getElementsByClassName(className)[0];
  const getRect = el => el.getBoundingClientRect();

  // Get elements and generate points
  const [anchor, check] = ['rc-anchor rc-anchor-normal', 'recaptcha-checkbox-checkmark'].map(
    className => {
      const el = getByClassName(className);
      const pt = randPoint(getRect(el));
      return { el, pt };
    },
  );

  // Simulate Events
  simulateEvent(anchor.el, 'mousemove', anchor.pt, sourcePt);
  ['mousedown', 'mouseup', 'click'].forEach(evt => {
    simulateEvent(check.el, evt, check.pt, sourcePt);
  });
}

async function autoClick() {
  // Wait for iframe load
  await waitForLoad();

  // Wait for iframe content load
  await new Promise(resolve => setTimeout(resolve, rand(400, 450)));

  // Get position and simulate click
  const [x, y] = window.Bridge.Captcha.getPosition();
  const sourcePt = {
    x: x + rand(200, 300),
    y: y + rand(300, 430),
  };
  simulateClick(sourcePt);
}

function resetChallenge(shouldAutoClick = false) {
  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
  _iframe = null;
  if (shouldAutoClick) {
    autoClick();
  }
}

async function submitCaptcha() {
  const token = document.getElementById('g-recaptcha-response').value;
  window.Bridge.harvestCaptchaToken(_runnerId, token, _siteKey);
  await new Promise(resolve => setTimeout(resolve, rand(500, 1000))); // wait a little bit before resetting

  resetChallenge(true);
}

async function onLoad() {
  if (_started) {
    window.grecaptcha.render('captchaContainer', {
      size: 'normal',
      sitekey: _siteKey,
      theme: 'light',
      callback: submitCaptcha,
    });
    _initialized = true;
    _iframe = null;
  }
}

async function _registerStartHandler(_, runnerId, siteKey) {
  if (_started) {
    return;
  }

  _runnerId = runnerId;
  _siteKey = siteKey;
  _started = true;

  // Show the form if it was previous hidden
  const form = document.getElementById('captchaForm');
  form.setAttribute('style', '');

  if (!_initialized) {
    await onLoad(); // initialize
  }

  // If recaptcha has been previously loaded, reset it
  resetChallenge(true);
}

function _registerStopHandler() {
  _started = false;
  // Hide the form and reset it for when we start again
  const form = document.getElementById('captchaForm');
  form.setAttribute('style', 'display: none;');
  resetChallenge();
}

function _onLoad() {
  window.Bridge.Captcha.start.register(_registerStartHandler);
  window.Bridge.Captcha.stop.register(_registerStopHandler);

  document.getElementById('close-btn').onclick = window.Bridge.close;
  document.getElementById('launch-youtube').onclick = window.Bridge.launchYoutube;
  document.getElementById('end-session').onclick = window.Bridge.endCaptchaSession;
}

function _onClose() {
  window.Bridge.Captcha.start.deregister(_registerStartHandler);
  window.Bridge.Captcha.stop.deregister(_registerStopHandler);
}

function setupWindowHandler(event, func) {
  if (window.attachEvent) {
    window.attachEvent(event, func);
  } else if (window[event]) {
    const prevHandler = window[event];
    const newHandler = evt => {
      prevHandler(evt);
      func(evt);
    };
    window[event] = newHandler;
  } else {
    window[event] = func;
  }
}

setupWindowHandler('onload', _onLoad);
setupWindowHandler('onclose', _onClose);
