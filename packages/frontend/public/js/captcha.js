let _siteKey = '';
let _runnerId = '';
let _started = false;

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
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', 'https://www.google.com/recaptcha/api.js');
  const div = document.createElement('div');
  div.innerHTML = `<div class="g-recaptcha" data-sitekey="${siteKey}" data-callback="submitCaptcha"></div>`;
  const form = document.getElementById('captchaForm');
  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
  while (form.lastChild) {
    form.removeChild(form.lastChild);
  }
  form.appendChild(div);
  form.appendChild(script);
}

function _registerStopHandler() {
  _started = false;
  window.Bridge.refreshCaptchaWindow();
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
