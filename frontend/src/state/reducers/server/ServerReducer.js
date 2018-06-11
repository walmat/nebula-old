import { SERVER_FIELDS, SERVER_ACTIONS } from '../../Actions';

export const initialServerState = {
    AWSCredentials: {
        AWSUsername: '',
        AWSPassword: ''
    },
    proxies: {
        numProxies: 0,
        proxy: {
            id: null,
            ip: '',
            port: '',
            username: '',
            password: ''
        }
    },
    server: {
        name: '',
        size: '',
        location: ''
    },
    errors: {
        //todo - fill these out
    }
};

export function serverReducer(state = initialServerState, action) {
    let change = {};
    if (action.type === SERVER_ACTIONS.EDIT) {
        switch (action.field) {
            case SERVER_FIELDS.EDIT_SERVER_CHOICE:
                change = {
                    server: action.value
                };
                break;
            case SERVER_FIELDS.EDIT_SERVER_SIZE:
                change = {
                    serverSize: action.value
                };
                break;
            case SERVER_FIELDS.EDIT_SERVER_LOCATION:
                change = {
                    serverLocation: action.value
                };
                break;
            case SERVER_FIELDS.EDIT_PROXY_NUMBER:
                change = {
                    numProxies: action.value
                };
                break;
            case SERVER_FIELDS.EDIT_PROXY_USERNAME:
                change = {
                    proxyUsername: action.value
                };
                break;
            case SERVER_FIELDS.EDIT_PROXY_PASSWORD:
                change = {
                    proxyPassword: action.value
                };
                break;
            default:
                change = {};
        }
    } else if (action.type === SERVER_ACTIONS.ADD) {
        switch(action.field) {
            case SERVER_FIELDS.ADD:
                change = {
                    selectedServer: action.value
                }
        }
    } else if (action.type === SERVER_ACTIONS.REMOVE) {
        switch(action.field) {
            case SERVER_FIELDS.REMOVE:
                change = {
                    selectedServer: action.value //TODO maybe this is wrong??
                }
        }
    }

    console.log(action, change);

    return Object.assign({}, state, change);
}
