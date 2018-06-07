import { SERVER_FIELDS, SERVER_ACTIONS } from '../../Actions';

export const initialServerState = {
    id: null,
    selectedServer: '',
    serverName: '',
    serverSize: '',
    serverLocation: '',
    errors: {
        serverName: null,
        serverSize: null,
        serverLocation: null,
        selectedServer: null
    }
};

export function serverReducer(state = initialServerState, action) {
    let change = {};
    if (action.type === SERVER_ACTIONS.EDIT) {
        switch (action.field) {
            case SERVER_FIELDS.EDIT_SERVER_CHOICE:
                change = {
                    serverName: action.value
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
