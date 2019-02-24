let _siteKey = '';
let _runnerId = '';
let _started = false;
let _initialized = false;
let _iframe = null;

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
  const event = target.ownerDocument.createEvent('MouseEvents');
  const opts = {
    altKey: false,
    button: 0,
    canBubble: true,
    cancelable: true,
    clientX: destPt.x,
    clientY: destPt.y,
    ctrlKey: false,
    detail: 0,
    metaKey: false,
    relatedTarget: null,
    screenX: sourcePt.x,
    screenY: sourcePt.y,
    shiftKey: false,
    type: evt,
    view: window,
    ...options, // Use given options to override any default options
  };

  event.initMouseEvent(
    opts.type,
    opts.canBubble,
    opts.cancelable,
    opts.view,
    opts.detail,
    opts.screenX,
    opts.screenY,
    opts.clientX,
    opts.clientY,
    opts.ctrlKey,
    opts.altKey,
    opts.shiftKey,
    opts.metaKey,
    opts.button,
    opts.relatedTarget,
  );
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

  // Get elements
  const [anchor, check] = ['rc-anchor rc-anchor-normal', 'recaptcha-checkbox-checkmark'].map(
    getByClassName,
  );

  // Generate points
  const [anchorPt, checkPt] = [anchor, check].map(el => randPoint(getRect(el)));

  // Simulate Events
  simulateEvent(anchor, 'mousemove', anchorPt, sourcePt);
  ['mousedown', 'mouseup', 'click'].forEach(evt => {
    simulateEvent(check, evt, checkPt, sourcePt);
  });
}

async function autoClick() {
  // Wait for iframe load
  await waitForLoad();

  // Wait for iframe content load
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get position and simulate click
  const [x, y] = window.Bridge.Captcha.getPosition();
  const sourcePt = {
    x: x + rand(200, 300),
    y: y + rand(300, 430),
  };
  simulateClick(sourcePt);
}

// This function is given to the recaptcha element, but it is set
// as an attribute and not referenced. eslint can't detect this and
// throws and error, but this function is used.
//
// For more info, see https://developers.google.com/recaptcha/docs/display#config
// eslint-disable-next-line no-unused-vars
async function submitCaptcha() {
  const token = document.getElementById('g-recaptcha-response').value;
  window.Bridge.harvestCaptchaToken(_runnerId, token, _siteKey);
  await new Promise(resolve => setTimeout(resolve, 500)); // wait a little bit before resetting

  window.grecaptcha.reset();
  _iframe = null;
  autoClick();
}

function _registerStartHandler(ev, runnerId, siteKey) {
  if (_started) {
    return;
  }

  _runnerId = runnerId;
  _siteKey = siteKey;
  _started = true;

  // Show the form if it was previous hidden
  const form = document.getElementById('captchaForm');
  form.setAttribute('style', '');

  // Initialize the captcha page
  if (!_initialized) {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', 'https://www.google.com/recaptcha/api.js');
    const div = document.createElement('div');
    div.setAttribute('data-sitekey', `${siteKey}`);
    div.setAttribute('data-callback', 'submitCaptcha');
    div.setAttribute('class', 'g-recaptcha');
    while (form.lastChild) {
      form.removeChild(form.lastChild);
    }
    form.appendChild(div);
    form.appendChild(script);
    _initialized = true;
    _iframe = null;
  }

  // If recaptcha has been previously loaded, reset it
  if (window.grecaptcha) {
    window.grecaptcha.reset();
    _iframe = null;
  }
  autoClick();
}

function _registerStopHandler() {
  _started = false;
  // Hide the form and reset it for when we start again
  const form = document.getElementById('captchaForm');
  form.setAttribute('style', 'display: none;');
  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
  _iframe = null;
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
