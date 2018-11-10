function submitCaptcha() {
  const token = document.getElementById('g-recaptcha-response').value;
  console.log('submit?');
  console.log(token);
  window.Bridge.harvestCaptchaToken(token);
  grecaptcha.reset();
  window.Bridge.refreshCaptchaWindow();
}

function _registerStartHandler(ev, runnerId, siteKey) {
  // TODO: Remove this!
  console.log(`[DEBUG]: Starting token on site: ${siteKey} for runner: ${runnerId}`);
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', 'https://www.google.com/recaptcha/api.js');
  const div = document.createElement('div');
  div.innerHTML = `<div class="g-recaptcha" data-sitekey="${siteKey}" data-callback="submitCaptcha"></div>`;
  const form = document.getElementById('captchaForm');
  form.appendChild(div);
  form.appendChild(script);
}

function _registerStopHandler(ev, runnerId, siteKey) {
  // TODO: Remove this!
  console.log(`[DEBUG]: Stopping token on site: ${siteKey} for runner: ${runnerId}`);
  grecaptcha.reset();
  window.Bridge.refreshCaptchaWindow();
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
