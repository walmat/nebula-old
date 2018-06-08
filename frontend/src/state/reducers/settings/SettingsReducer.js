import {SETTINGS_ACTIONS, SETTINGS_FIELDS} from '../../Actions';

export const initialSettingsState = {
    proxies: {}
};

export function settingsReducer(state = initialSettingsState, action) {
    let change = {};
    if (action.type === SETTINGS_ACTIONS.EDIT) {
        switch (action.field) {
            case SETTINGS_FIELDS.EDIT_PROXIES:
                change = {
                    proxies: formatProxy(action.value.split(/\r?\n/))
                };
                break;
            default:
                change = {};
                break;
        }
    }

    console.log(change, action);

    change.errors = action.errors;

    return Object.assign({}, state, change);
}

function formatProxy (arr) {
    let ret = [];
    for (let i = 0; i < arr.length; i++) {
        //format --> ip:port:user:pass || ip:port
        let data = arr[i].split(':');
        if (data.length === 2) {
            ret.push('http://' + data[0] + ':' + data[1]);
        } else if (data.length === 4) {
            ret.push('http://' + data[2] + ':' + data[3] + '@' + data[0] + ':' + data[1]);
        }
    }
    return ret;
};