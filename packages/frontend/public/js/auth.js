window.onload = () => {
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './js/nebula.json',
  };
  const anim = bodymovin.loadAnimation(animData);
  const close = document.getElementById('close');
  const submit = document.getElementById('license-key-submit');

  close.onclick = window.Bridge.close;
  submit.onclick = checkLicense;
};
