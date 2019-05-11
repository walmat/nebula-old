let _siteKey = '';
let _runnerId = '';
let _started = false;
let _resetting = false;
let _initialized = false;
let _submitting = false;
let _waitingForLoad = false;
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

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForLoad() {
  if (_iframe || _waitingForLoad) {
    return;
  }
  _waitingForLoad = true; // Set waiting flag so we don't unnecessary poll multiple times
  await waitFor(150); // Wait a base amount of time before polling for iframe
  let iframe = document.querySelector('iframe[role=presentation]');
  while (!iframe) {
    // eslint-disable-next-line no-await-in-loop
    await waitFor(25); // Poll every 25 ms for iframe
    iframe = document.querySelector('iframe[role=presentation]');
  }
  let content = iframe.contentDocument || iframe.contentWindow.document;
  while (!content.getElementsByClassName('recaptcha-checkbox-checkmark').length) {
    // eslint-disable-next-line no-await-in-loop
    await waitFor(25);
    content = iframe.contentDocument || iframe.contentWindow.document;
  }
  _waitingForLoad = false;
  _iframe = iframe;
}

function simulateEvent(target, evt, destPt, sourcePt, options) {
  const opts = {
    type: evt,
    clientX: destPt.x,
    clientY: destPt.y,
    screenX: sourcePt.x,
    screenY: sourcePt.y,
    ...options, // Use given options to override any default options
  };
  const event = target.ownerDocument.createEvent('MouseEvents');
  event.initMouseEvent(...evtOptionsToArgs(opts));
  target.dispatchEvent(event);
}

async function simulateClick(sourcePt) {
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
  const [check, ...anchors] = [
    'recaptcha-checkbox-checkmark',
    'rc-anchor rc-anchor-normal',
    'rc-anchor-center-container',
    'rc-anchor-center-item',
    'recaptcha-checkbox',
  ].map(className => {
    const el = getByClassName(className);
    const pt = randPoint(getRect(el));
    return { el, pt };
  });
  // Simulate Events
  await Promise.all(
    anchors.map(async ({ el, pt }, idx) => {
      simulateEvent(el, 'mousemove', pt, sourcePt);
      await waitFor(idx * rand(20, 50));
    }),
  );
  await Promise.all(
    ['mousedown', 'mouseup', 'click'].map(async (evt, idx) => {
      await waitFor(idx * rand(30, 50));
      simulateEvent(check.el, evt, check.pt, sourcePt);
    }),
  );
}

async function autoClick() {
  // Wait for iframe load
  await waitForLoad();

  // Get position and simulate click
  const [x, y] = window.Bridge.Captcha.getPosition();
  const sourcePt = {
    x: x + rand(100, 300),
    y: y + rand(100, 550),
  };
  await simulateClick(sourcePt);
}

function resetChallenge() {
  // Guard against too many reset calls
  if (_resetting) {
    return;
  }
  _resetting = true;
  _iframe = null;
  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
  if (_started) {
    autoClick();
  } else {
    const form = document.getElementById('captchaForm');
    form.setAttribute('style', 'display: none;');
  }
  _resetting = false;
}

// This function is used, but it is specified in the
// script tag's src attribute. eslint is unable to detect
// this, so it throws an error.
// eslint-disable-next-line no-unused-vars
async function submitCaptcha() {
  _submitting = true;
  const captchaResponse = document.getElementById('g-recaptcha-response');
  // Only capture/send token if we can get it
  if (captchaResponse) {
    const token = captchaResponse.value;
    window.Bridge.harvestCaptchaToken(_runnerId, token, _siteKey);
    await waitFor(rand(500, 1000)); // wait a little bit before resetting
  }
  resetChallenge();
  _submitting = false;
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
  form.setAttribute('style', 'visibility:visible;');

  if (!_initialized) {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    const container = document.createElement('div');
    container.setAttribute('id', 'captchaContainer');
    container.setAttribute('class', 'g-recaptcha');
    container.setAttribute('data-sitekey', `${siteKey}`);
    container.setAttribute('data-theme', 'light');
    container.setAttribute('data-size', 'normal');
    container.setAttribute('data-callback', 'submitCaptcha');
    while (form.lastChild) {
      form.removeChild(form.lastChild);
    }
    form.appendChild(container);
    form.appendChild(script);
    _initialized = true;
  }

  // If recaptcha has been previously loaded, reset it
  resetChallenge();
}

function _registerStopHandler() {
  _started = false;

  if (!_submitting) {
    resetChallenge();
  }
}

function _onSaveProxy() {
  const proxy = document.getElementById('captcha-proxy').value;
  window.Bridge.saveProxyForCaptchaWindow(proxy);
}

function _onThemeChange(options) {
  const { backgroundColor } = options;
  document.body.style['background-color'] = backgroundColor;
}

function _onLoad() {
  window.Bridge.Captcha.start.register(_registerStartHandler);
  window.Bridge.Captcha.stop.register(_registerStopHandler);
  window.Bridge.Theme.change.register(_onThemeChange);

  // trick to make it seem like the document is always in focus
  Object.defineProperty(document, 'hidden', {
    value: false,
  });

  document.getElementById('close-btn').onclick = window.Bridge.close;
  document.getElementById('launch-youtube').onclick = window.Bridge.launchYoutube;
  document.getElementById('end-session').onclick = window.Bridge.endCaptchaSession;
  document.getElementById('save-captcha-proxy').onclick = _onSaveProxy;
}

function _onClose() {
  window.Bridge.Captcha.start.deregister(_registerStartHandler);
  window.Bridge.Captcha.stop.deregister(_registerStopHandler);
  window.Bridge.Theme.change.deregister(_onThemeChange);
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
