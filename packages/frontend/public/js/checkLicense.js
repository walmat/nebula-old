function checkLicense() {
  const key = document.getElementById('license-key-input').value;
  window.Bridge.authenticate(key);
}
