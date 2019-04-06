window.onload = () => {
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './nebula.json',
  };
  const anim = bodymovin.loadAnimation(animData);
  const close = document.getElementById('close');
  const submit = document.getElementById('license-key-submit');
  const input = document.getElementById('license-key-input');

  input.onkeypress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkLicense();
    }
  };

  close.onclick = window.Bridge.close;
  submit.onclick = checkLicense;
};
