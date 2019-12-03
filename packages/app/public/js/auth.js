document.addEventListener('DOMContentLoaded', () => {
  const close = document.getElementById('close');
  const submit = document.getElementById('license-key-submit');

  close.onclick = window.Bridge.close;
  // eslint-disable-next-line no-undef
  submit.onclick = checkLicense;
});