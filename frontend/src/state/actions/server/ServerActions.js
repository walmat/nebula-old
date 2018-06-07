import makeActionCreator from '../ActionCreator';

// Top level Actions
export const SERVER_ACTIONS = {
    ADD: 'ADD_SERVER',
    REMOVE: 'REMOVE_SERVER',
    EDIT: 'EDIT_SERVER',
};

const addServer = makeActionCreator(SERVER_ACTIONS.ADD, 'server');
const removeServer = makeActionCreator(SERVER_ACTIONS.REMOVE, 'id');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

export const serverActions = {
    add: addServer,
    remove: removeServer,
    edit: editServer,
};

// Field Edits
export const SERVER_FIELDS = {
    EDIT_SERVER_CHOICE: 'EDIT_SERVER_CHOICE',
    EDIT_SERVER_SIZE: 'EDIT_SERVER_SIZE',
    EDIT_SERVER_LOCATION: 'EDIT_SERVER_LOCATION'
};

export const mapProfileFieldToKey = {
    [SERVER_FIELDS.EDIT_SERVER_CHOICE]: 'server_choice',
    [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'server_size',
    [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'server_location'
};
