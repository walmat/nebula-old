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

  document.getElementById('close').onclick = window.Bridge.close;
  document.getElementById('license-key-submit').onclick = checkLicense;
};
