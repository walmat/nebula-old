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

// Get session from store
function getSession() {
  let session = store.get('session');

  if (session) {
    session = JSON.parse(session);

    if (session.expiry === null || session.expiry > Date.now()) {
      console.log(Date.now());
      console.log('returning session...');
      return session;
    }
  }
  return null;
}
module.exports.getSession = getSession;

// Get key from store
function getPreviousLicense() {
  let session = getSession();
  let license = store.get('license');

  // Check if session is available
  if (!session) {
    // Attempt to get expired session
    session = store.get('session');
    if (session) {
      session = JSON.parse(session);
    } else {
      return null;
    }
  }

  // Check if license was saved
  if (license) {
    license = JSON.parse(license);

    // Return is tokens match
    if (license.token === session.token) {
      return license;
    }
  }

  return null;
}
module.exports.getPreviousLicense = getPreviousLicense;

// Clear session from store
async function clearSession() {
  const session = getSession();
  if (session) {
    await fetch(`${process.env.NEBULA_API_URL}/auth`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application.json',
      },
    });
  }

  store.delete('session');
}
module.exports.clearSession = clearSession;

async function createSession(key) {
  if (_isDevelopment) {
    return { id: 'dev', token: 'DEVMODE', expiry: null };
  }
  const session = getSession();
  if (session) {
    return session;
  }

  const res = await fetch(`${process.env.NEBULA_API_URL}/auth`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });
  if (res.ok) {
    const { data, errors } = await res.json();
    console.log(data);
    if (errors) {
      console.error(errors);
      return { errors };
    }

    const { id, attributes: { token, expiry } } = data;
    store.set('session', JSON.stringify({ id, token, expiry }));
    store.set('license', JSON.stringify({ key, token }));

    console.log('got data and saved it');

    return { id, token, expiry };
  }
  const { errors } = await res.json();
  return { errors };
}
module.exports.createSession = createSession;
