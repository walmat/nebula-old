import {
  SERVER_FIELDS,
  SERVER_ACTIONS,
  mapServerFieldToKey,
  subMapToKey,
} from '../../actions';
import { initialServerStates } from '../../../utils/definitions/serverDefinitions';

export function serverReducer(state = initialServerStates.serverInfo, action) {
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
          size: type && type.id === action.value.id ? size : null,
        };
        break;
      case SERVER_FIELDS.EDIT_PROXY_NUMBER:
        const intValue = action.value === '' ? 0 : parseInt(action.value, 10);
        change = {
          numProxies: Number.isNaN(intValue)
            ? initialServerStates.proxyOptions.numProxies
            : intValue,
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
    nextState[mapServerFieldToKey[action.field]] = Object.assign(
      {},
      nextState[mapServerFieldToKey[action.field]],
      change,
    );
  } else if (action.type === SERVER_ACTIONS.ERROR) {
    console.error(
      `Error trying to perform: ${action.action}! Reason: ${action.error}`,
    );
  } else if (action.type === SERVER_ACTIONS.GEN_PROXIES) {
    nextState.proxies = action.proxies;
  } else if (action.type === SERVER_ACTIONS.DESTROY_PROXIES) {
    nextState.proxies = initialServerStates.serverInfo.proxies;
  } else if (action.type === SERVER_ACTIONS.DESTROY_ALL) {
    // todo
    // nextState = nextState.filter(s => s.id !== action);
  } else if (action.type === SERVER_ACTIONS.VALIDATE_AWS) {
    nextState.credentials.accessToken = action.token;
  } else if (action.type === SERVER_ACTIONS.LOGOUT_AWS) {
    nextState.credentials = initialServerStates.awsCredentials;
  } else if (action.type === SERVER_ACTIONS.CONNECT) {
    nextState.coreServer = {
      serverOptions: {
        type: action.serverInfo.type,
        size: action.serverInfo.size,
        location: action.serverInfo.location,
      },
      awsCredentials: {
        AWSAccessKey: action.credentials.AWSAccessKey,
        AWSSecretKey: action.credentials.AWSSecretKey,
        accessToken: action.credentials.accessToken,
      },
    };
  }

  return nextState;
}

export function serverListReducer(
  state = initialServerStates.serverList,
  action,
) {
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case SERVER_ACTIONS.CONNECT:
      const server = nextState.find(s => s.id === action.id);
      if (server) {
        server.status = 'Connected';
      }
      break;
    case SERVER_ACTIONS.CREATE:
      // perform a deep copy of given profile
      const serverOptions = JSON.parse(
        JSON.stringify(action.serverInfo.serverOptions),
      );
      const newServer = {
        id: action.serverInfo.path,
        type: serverOptions.type,
        size: serverOptions.size,
        location: serverOptions.location,
        charges: '0',
        status: 'Initializing...',
      };
      nextState.push(newServer);
      break;
    case SERVER_ACTIONS.DESTROY:
      nextState = nextState.filter(
        s => s.id !== action.serverPath.TerminatingInstances[0].InstanceId,
      );
      break;
    case SERVER_ACTIONS.DESTROY_ALL:
      nextState = [];
      break;
    default:
      break;
  }
  return nextState;
}
