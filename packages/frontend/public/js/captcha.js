let _siteKey = '';
let _runnerId = '';
let _started = false;
let _initialized = false;

// This function is given to the recaptcha element, but it is set
// as an attribute and not referenced. eslint can't detect this and
// throws and error, but this function is used.
//
// For more info, see https://developers.google.com/recaptcha/docs/display#config
// eslint-disable-next-line no-unused-vars
function submitCaptcha() {
  const token = document.getElementById('g-recaptcha-response').value;
  window.Bridge.harvestCaptchaToken(_runnerId, token, _siteKey);
  window.grecaptcha.reset();
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
  }

  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
}

function _registerStopHandler() {
  _started = false;
  // Hide the form and reset it for when we start again
  const form = document.getElementById('captchaForm');
  form.setAttribute('style', 'display: none;');
  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
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
