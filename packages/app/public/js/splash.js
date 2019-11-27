document.addEventListener('DOMContentLoaded', async () => {
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

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const getRandomIntInclusive = (min, max) => {
    const randMin = Math.ceil(min);
    const randMax = Math.floor(max);
    return Math.floor(Math.random() * (randMax - randMin + 1)) + randMin;
  };

  const statusText = document.getElementById('status-text');

  const statuses = [
    'Initializing...',
    'Loading Modules',
    'Attaching Monitor Pool',
    'All set. Launching...',
  ];

  for (let i = 0; i < statuses.length; i += 1) {
    statusText.innerHTML = statuses[i];
    // eslint-disable-next-line no-await-in-loop
    await sleep(getRandomIntInclusive(500, 1500));
  }
});
