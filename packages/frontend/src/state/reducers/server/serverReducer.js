import { SERVER_FIELDS, SERVER_ACTIONS, mapServerFieldToKey, subMapToKey } from '../../actions';
import initialServerStates from '../../initial/servers';

export function serverReducer(state = initialServerStates, action) {
  // initialize change object
  let change = {};
  // Deep copy the current state
  const nextState = JSON.parse(JSON.stringify(state));
  // Check if we are performing an edit
  if (action.type === SERVER_ACTIONS.EDIT) {
    // Choose what to change based on the field
    switch (action.field) {
      case SERVER_FIELDS.EDIT_SERVER_TYPE: {
        const { type, size } = state[mapServerFieldToKey[action.field]];
        change = {
          type: action.value,
          // If we are selecting a different type, reset the size to force the user to reselect
          size: type && type.id === action.value.id ? size : null,
        };
        break;
      }
      case SERVER_FIELDS.EDIT_PROXY_NUMBER: {
        if (!action || action.errors) {
          break;
        }
        const intValue = action.value === '' ? 0 : parseInt(action.value, 10);
        nextState.proxyOptions = {
          ...nextState.proxyOptions,
          number: intValue,
        };
        break;
      }
      case SERVER_FIELDS.EDIT_AWS_ACCESS_KEY: {
        if (!action || action.errors) {
          break;
        }
        nextState.credentials = {
          ...nextState.credentials,
          current: {
            ...nextState.credentials.current,
            AWSAccessKey: action.value,
          },
        };
        break;
      }
      case SERVER_FIELDS.EDIT_AWS_SECRET_KEY: {
        if (!action || action.errors) {
          break;
        }
        nextState.credentials = {
          ...nextState.credentials,
          current: {
            ...nextState.credentials.current,
            AWSSecretKey: action.value,
          },
        };
        break;
      }
      default: {
        change = {
          [subMapToKey[action.field]]: action.value,
        };
        break;
      }
    }
  } else if (action.type === SERVER_ACTIONS.ERROR) {
    if (!action || (action && !action.action)) {
      return nextState;
    }

    switch (action.action) {
      case SERVER_ACTIONS.VALIDATE_AWS: {
        if (action.error && action.error.message) {
          nextState.credentials.status = action.error.message;
        } else {
          nextState.credentials.status = 'Invalid action';
        }
        break;
      }
      default:
        console.error(`Error trying to perform: ${action.action}! Reason: ${action.error}`);
        break;
    }
  } else if (action.type === SERVER_ACTIONS.CLEANUP_STATUS) {
    if (!action || (action && !action.field)) {
      return nextState;
    }

    switch (action.field) {
      case SERVER_ACTIONS.VALIDATE_AWS: {
        nextState.credentials.status = '';
        break;
      }
      default:
        break;
    }
  } else if (action.type === SERVER_ACTIONS.GEN_PROXIES) {
    console.log(action, nextState);
    if (!action || !action.proxyInfo) {
      return nextState;
    }
    const { region, proxies } = action.proxyInfo;
    if (!region || !proxies) {
      return nextState;
    }
    nextState.proxies.push({ region, proxies });
  } else if (action.type === SERVER_ACTIONS.DESTROY_PROXIES) {
    const proxyGroups = nextState.proxies.map(p => p.proxies);
    nextState.proxies = nextState.proxies.filter(p => proxyGroups.some(i => i.id !== p.proxies.id));
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

export function serverListReducer(state = initialServerStates, action) {
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case SERVER_ACTIONS.CONNECT: {
      const server = nextState.find(s => s.id === action.id);
      if (server) {
        server.status = 'Connected';
      }
      break;
    }
    case SERVER_ACTIONS.CREATE: {
      const serverOptions = JSON.parse(JSON.stringify(action.serverInfo.serverOptions));
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
    }
    case SERVER_ACTIONS.DESTROY: {
      if (!action || !action.instance) {
        break;
      }
      nextState = nextState.filter(s => action.instance.some(i => i.id !== s.id));
      break;
    }
    case SERVER_ACTIONS.DESTROY_ALL: {
      if (!action || !action.instances) {
        break;
      }
      nextState = nextState.filter(i => action.instances.some(instance => instance.id !== i.id));
      break;
    }
    default: {
      break;
    }
  }
  return nextState;
}
