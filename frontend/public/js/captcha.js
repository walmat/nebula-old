let _siteKey = '';
let _runnerId = '';

function submitCaptcha() {
  const token = document.getElementById('g-recaptcha-response').value;
  window.Bridge.harvestCaptchaToken(_runnerId, token, _siteKey);
  window.grecaptcha.reset();
  window.Bridge.refreshCaptchaWindow();
}

function _registerStartHandler(ev, runnerId, siteKey) {
  // TODO: Remove this!
  console.log(`[DEBUG]: Starting token on site: ${siteKey} for runner: ${runnerId}`);
  _runnerId = runnerId;
  _siteKey = siteKey;
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

function _registerStopHandler(ev, runnerId, siteKey) {
  console.log(window.grecaptcha);
  // TODO: Remove this!
  console.log(`[DEBUG]: Stopping token on site: ${siteKey} for runner: ${runnerId}`);
  window.grecaptcha.reset();
  window.Bridge.refreshCaptchaWindow();

  // TODO: Check if runner/sitekey match what we have
}

function registerForCaptchaEvents() {
  // TODO: Remove this!
  console.log('[DEBUG]: Registering for captcha events...');
  window.Bridge.Captcha.start.register(_registerStartHandler);
  window.Bridge.Captcha.stop.register(_registerStopHandler);
}

function deregisterForCaptchaEvents() {
  // TODO: Remove this!
  console.log('[DEBUG]: Deregistering for captcha events...');
  window.Bridge.Captcha.start.deregister(_registerStartHandler);
  window.Bridge.Captcha.stop.deregister(_registerStartHandler);
}

function setupWindowHandler(event, func) {
  if (window.attachEvent) {
    window.attachEvent(event, func);
  } else if (window[event]) {
    const prevHandler = window[event];
    const newHandler = (evt) => {
      prevHandler(evt);
      func(evt);
    };
    window[event] = newHandler;
  } else {
    window[event] = func;
  }
}

setupWindowHandler('onload', registerForCaptchaEvents);
setupWindowHandler('onclose', deregisterForCaptchaEvents);
