const Store = require('electron-store');
const fetch = require('node-fetch');

const nebulaEnv = require('./env');

// Set up nebula environment variables
nebulaEnv.setUpEnvironment();
const _isDevelopment = process.env.NEBULA_ENV === 'development';


const store = new Store();
if (_isDevelopment) {
  module.exports.store = store;
}

// Get session from store
async function getSession() {
  let session = store.get('session');

  if (session) {
    session = JSON.parse(session);
    if (session.expiry === null || session.expiry > (Date.now() / 1000)) {
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
    console.log('[ERROR] Unable to perform refresh: ', error);
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
      console.log('[ERROR]: Unable to Delete: ', error);
      return false;
    }
  }
  store.delete('session');
  return true;
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
  console.log('[ERROR]: Unable to create auth token: ', body);
  return { errors: body.error };
}
module.exports.createSession = createSession;

async function deactivateFrontEnd() {
  const session = await getSession();
  console.log(session);
  if (session) {
    const res = await fetch(`${process.env.NEBULA_API_URL}/auth/discord`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      }
    });
    console.log(res);
  }
}
module.exports.deactivateFrontEnd = deactivateFrontEnd;
