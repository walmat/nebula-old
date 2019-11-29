import uuidv4 from 'uuid/v4';

import { SETTINGS_ACTIONS } from '../../../store/actions';
import { Accounts } from '../initial';

export default function accountListReducer(state = Accounts, action) {
  // short circuit for malformed action...
  if (!action.type) {
    return state;
  }

  if (action.type === SETTINGS_ACTIONS.ADD_ACCOUNT) {
    const { account } = action;

    if (!account) {
      return state;
    }

    // new account...
    if (!account.id) {
      let newId;
      const idCheck = acc => acc.id === newId;
      do {
        newId = uuidv4();
      } while (state.some(idCheck));

      account.id = newId;
      return state.push(account);
    }

    // existing account...
    return state.map(acc => {
      if (acc.id === account.id) {
        return account;
      }
      return acc;
    });
  }

  if (action.type === SETTINGS_ACTIONS.DELETE_ACCOUNT) {
    const { account } = action;

    if (!account || (account && !account.id)) {
      return state;
    }

    return state.filter(acc => acc.id !== account.id);
  }

  return state;
}
