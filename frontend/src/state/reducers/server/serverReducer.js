import {
  SERVER_FIELDS,
  SERVER_ACTIONS,
  mapServerFieldToKey,
} from '../../actions';

export const initialServerState = {
  credentials: {
    AWSAccessKey: '',
    AWSSecretKey: '',
  },
  proxy: {
    numProxies: 0,
    id: null,
    ip: '',
    port: '',
    username: '',
    password: '',
  },
  server: {
    type: {},
    size: {},
    location: {},
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
        change = {
          type: action.value,
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
        change = {
          numProxies: action.value,
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
      case SERVER_FIELDS.EDIT_AWS_USERNAME:
        change = {
          AWSUsername: action.value,
        };
        break;
      case SERVER_FIELDS.EDIT_AWS_PASSWORD:
        change = {
          AWSPassword: action.value,
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
  }

  // TEMPORARY
  console.log(action, change);

  return nextState;
}
