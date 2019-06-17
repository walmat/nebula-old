import { SERVER_FIELDS, SERVER_ACTIONS } from '../../actions';
import initialServerStates from '../../initial/servers';

export function serverReducer(state = initialServerStates, action) {
  // Deep copy the current state
  const nextState = JSON.parse(JSON.stringify(state));
  // Check if we are performing an edit
  if (action.type === SERVER_ACTIONS.EDIT) {
    // Choose what to change based on the field
    switch (action.field) {
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
      case SERVER_FIELDS.EDIT_PROXY_CREDENTIALS: {
        if (!action || action.errors) {
          break;
        }

        nextState.proxyOptions.credentials = action.value;
        break;
      }
      case SERVER_FIELDS.EDIT_PROXY_LOCATION: {
        if (!action || action.errors) {
          break;
        }

        nextState.proxyOptions = {
          ...nextState.proxyOptions,
          location: action.value,
        };
        break;
      }
      case SERVER_FIELDS.EDIT_PROXY_USERNAME: {
        if (!action || action.errors) {
          break;
        }

        nextState.proxyOptions = {
          ...nextState.proxyOptions,
          username: action.value,
        };
        break;
      }
      case SERVER_FIELDS.EDIT_PROXY_PASSWORD: {
        if (!action || action.errors) {
          break;
        }

        nextState.proxyOptions = {
          ...nextState.proxyOptions,
          password: action.value,
        };
        break;
      }
      default: {
        break;
      }
    }
  } else if (action.type === SERVER_ACTIONS.SELECT) {
    if (!action) {
      return nextState;
    }

    if (!action.credentials) {
      nextState.credentials.selected = initialServerStates.credentials.selected;
      nextState.credentials.current = nextState.credentials.selected;
      return nextState;
    }

    nextState.credentials.selected = action.credentials;
    nextState.credentials.current = nextState.credentials.selected;
  } else if (action.type === SERVER_ACTIONS.ERROR) {
    if (!action || (action && !action.action)) {
      return nextState;
    }

    if (action.cleanup) {
      nextState.credentials.status = '';
      nextState.proxyOptions.status = '';
      return nextState;
      // TODO: Add more statuses here when the come up
    }

    switch (action.action) {
      case SERVER_ACTIONS.VALIDATE_AWS: {
        nextState.credentials.status = action.error.message || 'Invalid action';
        break;
      }
      case SERVER_ACTIONS.GEN_PROXIES: {
        nextState.proxyOptions.status = action.error.message || 'Unable to generate';
        break;
      }
      case SERVER_ACTIONS.DESTROY_PROXIES: {
        nextState.proxyOptions.status = action.error.message || 'Unable to destroy';
        break;
      }
      default:
        console.error(`Error trying to perform: ${action.action}! Reason: ${action.error}`);
        break;
    }
  } else if (action.type === SERVER_ACTIONS.GEN_PROXIES) {
    if (!action || !action.response) {
      return nextState;
    }
    const { response } = action;

    if (!response || !response.length) {
      return nextState;
    }

    response.forEach(instance => {
      const index = nextState.proxies.findIndex(i => i.id === instance.id);
      if (index === -1) {
        nextState.proxies.push(instance);
        return;
      }

      nextState.proxies[index] = instance;
    });
  } else if (action.type === SERVER_ACTIONS.TERMINATE_PROXIES) {
    if (!action || !action.response) {
      return nextState;
    }
    const { response, done } = action;

    if (!done) {
      nextState.proxies.forEach(p => {
        if (response.some(i => i.id === p.id)) {
          p.status = 'pending';
        }
      });
      return nextState;
    }
    nextState.proxies = nextState.proxies.filter(p => !response.some(i => i.id === p.id));
  } else if (action.type === SERVER_ACTIONS.TERMINATE_PROXY) {
    if (!action || !action.response) {
      return nextState;
    }

    const { response, done } = action;

    if (!done) {
      const proxy = nextState.proxies.find(p => p.id === response.id);
      proxy.status = 'pending';
      return nextState;
    }
    nextState.proxies = nextState.proxies.filter(p => !response.some(i => i.id === p.id));
  } else if (action.type === SERVER_ACTIONS.TEST_PROXY) {
    if (
      !action ||
      !action.response ||
      (action.response && !action.response.speed) ||
      (action.response && !action.response.proxy)
    ) {
      return nextState;
    }

    const { speed, proxy } = action.response;

    const index = nextState.proxies.findIndex(p => p.proxy === proxy);

    if (index === -1) {
      return nextState;
    }

    nextState.proxies[index].speed = speed;
  } else if (action.type === SERVER_ACTIONS.VALIDATE_AWS) {
    if (
      !action ||
      !action.response ||
      (action && action.errors) ||
      ((action && !action.response.AWSAccessKey) || (action && !action.response.AWSSecretKey))
    ) {
      return nextState;
    }

    const { AWSAccessKey, AWSSecretKey } = action.response;
    nextState.credentials.list.push({ AWSAccessKey, AWSSecretKey, loggedIn: true });
    nextState.credentials.current = initialServerStates.credentials.current;
  } else if (action.type === SERVER_ACTIONS.LOGOUT_AWS) {
    if (
      !action ||
      !action.credentials ||
      (action && action.errors) ||
      ((action && !action.credentials.AWSAccessKey) || (action && !action.credentials.AWSSecretKey))
    ) {
      return nextState;
    }
    const {
      credentials: { AWSAccessKey, AWSSecretKey },
    } = action;

    if (
      nextState.proxyOptions.credentials &&
      nextState.proxyOptions.credentials.label === nextState.credentials.current.AWSAccessKey &&
      nextState.proxyOptions.credentials.value === nextState.credentials.current.AWSSecretKey
    ) {
      nextState.proxyOptions.credentials = initialServerStates.proxyOptions.credentials;
    }
    nextState.credentials.list = nextState.credentials.list.filter(
      c => c.AWSAccessKey !== AWSAccessKey && c.AWSSecretKey !== AWSSecretKey,
    );
    nextState.credentials.current = initialServerStates.credentials.current;
    nextState.credentials.selected = initialServerStates.credentials.selected;
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
