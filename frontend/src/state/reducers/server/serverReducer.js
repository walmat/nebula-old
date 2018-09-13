import uuidv4 from 'uuid/v4';

import {
  SERVER_FIELDS,
  SERVER_ACTIONS,
  mapServerFieldToKey,
  mapServerListFieldToKey,
  subMapToKey,
} from '../../actions';
import server from '../../../server/server';

export const initialServerState = {
  credentials: {
    AWSAccessKey: '',
    AWSSecretKey: '',
    accessToken: null,
  },
  proxyOptions: {
    numProxies: 0,
    username: '',
    password: '',
  },
  serverOptions: {
    type: {},
    size: {},
    location: {},
  },
  proxies: [],
  coreServer: {
    path: null,
    serverOptions: null,
    awsCredentials: null,
  },
};

const initialServerListRowState = {
  type: null,
  size: null,
  location: null,
  charges: null,
  status: null,
  action: null,
  errors: {
    type: null,
    size: null,
    location: null,
    charges: null,
    status: null,
    action: null,
  },
};

export const initialServerListState = [
  Object.assign(
    {},
    initialServerListRowState,
    JSON.parse('{"id": "1", "type": "Compute Optimized","size": "C5 - 4XL", "location": "US East (N. Virginia)", "charges": "$1.32", "status": "Connected", "action": ""}'),
  ),
  Object.assign(
    {},
    initialServerListRowState,
    JSON.parse('{"id": "2", "type": "General Purpose","size": "T2 - Micro", "location": "US East (N. Virginia)", "charges": "$0.15", "status": "Running", "action": ""}'),
  ),
];

export function serverReducer(state = initialServerState, action) {
  // initialize change object
  let change = {};
  // Deep copy the current state
  const nextState = JSON.parse(JSON.stringify(state));
  // Check if we are performing an edit
  if (action.type === SERVER_ACTIONS.EDIT) {
    // Choose what to change based on the field
    switch (action.field) {
      case SERVER_FIELDS.EDIT_SERVER_TYPE:
        const { type, size } = state[mapServerFieldToKey[action.field]];
        change = {
          type: action.value,
          // If we are selecting a different type, reset the size to force the user to reselect
          size: type && type.id === action.value.id ? size : {},
        };
        break;
      case SERVER_FIELDS.EDIT_PROXY_NUMBER:
        const intValue = parseInt(action.value, 10);
        change = {
          numProxies: Number.isNaN(intValue) ? '' : intValue,
        };
        break;
      default:
        change = {
          [subMapToKey[action.field]]: action.value,
        };
        break;
    }

    // Update the correct errors map
    change.errors = Object.assign(
      {},
      state[mapServerFieldToKey[action.field]].errors,
      action.errors,
    );

    // Edit the correct part of the next state based on the given field
    nextState[mapServerFieldToKey[action.field]] =
      Object.assign(
        {},
        nextState[mapServerFieldToKey[action.field]],
        change,
      );
  } else if (action.type === SERVER_ACTIONS.DESTROY) {
    console.log(action);
  } else if (action.type === SERVER_ACTIONS.ERROR) {
    console.error(`Error trying to perform: ${action.action}! Reason: ${action.error}`);
  } else if (action.type === SERVER_ACTIONS.GEN_PROXIES) {
    nextState.proxies = action.proxies;
  } else if (action.type === SERVER_ACTIONS.DESTROY_PROXIES) {
    nextState.proxies = null;
  } else if (action.type === SERVER_ACTIONS.VALIDATE_AWS) {
    nextState.credentials.accessToken = action.token;
  } else if (action.type === SERVER_ACTIONS.LOGOUT_AWS) {
    nextState.credentials = initialServerState.credentials;
  }

  return nextState;
}

export function serverListReducer(state = initialServerListState, action) {
  let change = {};
  const nextState = JSON.parse(JSON.stringify(state));

  if (action.type === SERVER_ACTIONS.CONNECT) {
    switch (action.field) {
      case '':
        // figure out this later...
        change = {
          [mapServerListFieldToKey[action.field]]: action.field,
        };
        break;
      default:
        break;
    }
  } else if (action.type === SERVER_ACTIONS.CREATE) {
    // perform a deep copy of given profile
    const serverOptions = JSON.parse(JSON.stringify(action.serverInfo.serverOptions));
    let newId = uuidv4();
    const newServer = {};
    newServer.id = newId;
    newServer.type = serverOptions.type.label;
    newServer.size = serverOptions.size.label;
    newServer.location = serverOptions.location.label;
    newServer.charges = '0';
    newServer.status = 'Initializing..';
    const idCheck = s => s.id === newId;
    while (nextState.some(idCheck)) {
      newId = uuidv4();
    }
    nextState.push(newServer);
  } else if (action.type === SERVER_ACTIONS.DESTROY) {
    // fix this
    const next = nextState.filter(s => s.id !== action.serverPath);
    return next;
  }
  return nextState;
}
