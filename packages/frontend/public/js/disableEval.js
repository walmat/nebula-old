// Disable eval in the preload context
// eslint-disable-next-line
window.eval = function () {
  throw new Error('Sorry, this app does not support window.eval().');
};
