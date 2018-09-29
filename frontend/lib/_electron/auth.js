const Store = require('electron-store');
const fetch = require('node-fetch');

const nebulaEnv = require('./env');

const _isDevelopment = process.env.NODE_ENV === 'development';

if (!process.env.NEBULA_ENV_LOADED) {
  // Set up nebula environment variables
  if (_isDevelopment) {
    nebulaEnv.setUpDevEnvironment();
  } else {
    nebulaEnv.setUpProdEnvironment();
  }
}

const store = new Store();
module.exports.store = store;

// Get session from store
async function getSession() {
  let session = store.get('session');

  if (session) {
    session = JSON.parse(session);

    if (session.expiry === null || session.expiry > (Date.now() / 1000)) {
      console.log('returning session...');
      return session;
    }

    // session expired, attempt to refresh it
    const res = await fetch(`${process.env.NEBULA_API_URL}/auth/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'refresh', token: session.refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      const { accessToken, refreshToken, expiry } = data;
      store.set('session', JSON.stringify({ accessToken, refreshToken, expiry }));
      return { accessToken, refreshToken, expiry };
    }
    const { error } = await res.json();
    console.log('ERROR PERFORMING REFRESH: ', error);
    return null;
  }
  return null;
}
module.exports.getSession = getSession;

// Clear session from store
async function clearSession() {
  const session = await getSession();
  if (session) {
    const res = await fetch(`${process.env.NEBULA_API_URL}/auth`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const { error } = await res.json();
      console.log('ERROR With Deletion: ', error);
      return;
    }
  }
  store.delete('session');
}
module.exports.clearSession = clearSession;

async function createSession(key) {
  if (_isDevelopment) {
    return { accessToken: 'DEVACCESS', refreshToken: 'DEVREFRESH', expiry: null };
  }
  const session = await getSession();
  if (session) {
    return session;
  }

  const res = await fetch(`${process.env.NEBULA_API_URL}/auth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'key', key }),
  });
  if (res.ok) {
    const data = await res.json();
    const { accessToken, refreshToken, expiry } = data;
    store.set('session', JSON.stringify({ accessToken, refreshToken, expiry }));

    return { accessToken, refreshToken, expiry };
  }
  const body = await res.json();
  console.log(body);
  return { errors: body.error };
}
module.exports.createSession = createSession;
