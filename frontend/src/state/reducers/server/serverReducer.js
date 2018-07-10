import {
  SERVER_FIELDS,
  SERVER_ACTIONS,
  mapServerFieldToKey,
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
          size: type.id === action.value.id ? size : {},
        };
        break;
      case SERVER_FIELDS.EDIT_SERVER_SIZE:
        change = {
          size: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_SERVER_LOCATION:
        change = {
          location: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_PROXY_NUMBER:
        const intValue = parseInt(action.value, 10);
        change = {
          numProxies: Number.isNaN(intValue) ? '' : intValue,
        };
        break;
      case SERVER_FIELDS.EDIT_PROXY_USERNAME:
        change = {
          username: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_PROXY_PASSWORD:
        change = {
          password: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_AWS_ACCESS_KEY:
        change = {
          AWSAccessKey: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_AWS_SECRET_KEY:
        change = {
          AWSSecretKey: action.value,
        };
        break;
      default:
        return nextState;
    }
    // Update the correct errors map
    change.errors = Object.assign(
      {},
      state[mapServerFieldToKey[action.field]].errors, action.errors,
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
