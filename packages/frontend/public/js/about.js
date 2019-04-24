window.onload = () => {
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './js/nebula.json',
  };

  const { name, version } = window.Bridge.getAppData();
  document.getElementById('title').innerHTML = name;
  document.getElementById('version').innerHTML = version;

  bodymovin.loadAnimation(animData);
  const close = document.getElementById('close');
  close.onclick = window.Bridge.close;
};
