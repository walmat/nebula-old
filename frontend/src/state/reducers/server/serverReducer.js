import {
  SERVER_FIELDS,
  SERVER_ACTIONS,
  mapServerFieldToKey,
  mapServerListFieldToKey,
  subMapToKey,
} from '../../actions';

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
    JSON.parse('{"type": "test","size": "test", "location": "test", "charges": "$0.15", "status": "running", "action": ""}')
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
  } else if (action.type === SERVER_ACTIONS.CREATE) {
    // Use the info given in the action as the core server info
    nextState.coreServer = action.serverInfo;
  } else if (action.type === SERVER_ACTIONS.DESTROY) {
    // Check if the path we want to destroy is the same as the current on, then
    // destroy if necessary
    if (state.coreServer.path === action.serverPath) {
      nextState.coreServer = null;
    }
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

  console.log(state);
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
  }
  return nextState;
}