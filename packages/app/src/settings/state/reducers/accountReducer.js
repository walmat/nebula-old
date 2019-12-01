import {
  SHARED_ACTIONS,
  ACCOUNT_ACTIONS,
  GLOBAL_ACTIONS,
  SETTINGS_FIELDS,
} from '../../../store/actions';
import { CurrentAccount } from '../initial';

export default function accountReducer(state = CurrentAccount, action = {}) {
  const { type, field, value } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return CurrentAccount;
  }

  if (type === SHARED_ACTIONS.EDIT) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_ACCOUNT_NAME:
        return { ...state, name: value };
      case SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME:
        return { ...state, username: value };
      case SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD:
        return { ...state, password: value };
      default:
        return state;
    }
  }

  if (type === ACCOUNT_ACTIONS.SELECT_ACCOUNT) {
    const { account } = action;

    // account without id means it hasn't been saved yet..
    if (!account || (account && !account.id) || (account && account.id === state.id)) {
      return state;
    }

    return account;
  }
  return state;
}
