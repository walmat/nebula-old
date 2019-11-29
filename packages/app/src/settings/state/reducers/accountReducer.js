import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { CurrentAccount } from '../initial';

export default function accountReducer(state = CurrentAccount, action) {
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_ACCOUNT_NAME:
        return { ...state, name: action.value };
      case SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME:
        return { ...state, username: action.value };
      case SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD:
        return { ...state, password: action.value };
      default:
        return state;
    }
  }

  if (action.type === SETTINGS_ACTIONS.SELECT_ACCOUNT) {
    const { account } = action;

    // account without id means it hasn't been saved yet..
    if (!account || (account && !account.id) || (account && account.id === state.id)) {
      return state;
    }

    return account;
  }
  return state;
}
