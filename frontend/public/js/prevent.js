function ready(callback) {
  if (document.readyState !== 'loading') callback();
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', callback);
  else {
    document.attachEvent('onreadystatechange', () => {
      if (document.readyState === 'complete') callback();
    });
  }
}

ready(() => {
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('drop', event => event.preventDefault());
});
