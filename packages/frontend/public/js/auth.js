document.addEventListener('DOMContentLoaded', () => {
  // Handler when the DOM is fully loaded
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './js/nebula.json',
  };

  // eslint-disable-next-line no-undef
  bodymovin.loadAnimation(animData);

  const close = document.getElementById('close');
  const submit = document.getElementById('license-key-submit');

  close.onclick = window.Bridge.close;
  // eslint-disable-next-line no-undef
  submit.onclick = checkLicense;
});