import uuidv4 from 'uuid/v4';

import { ACCOUNT_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Accounts } from '../initial';

export default function accountListReducer(state = Accounts, action = {}) {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Accounts;
  }

  if (type === ACCOUNT_ACTIONS.CREATE_ACCOUNT) {
    const { account } = action;

    if (
      !account ||
      (account && !account.name) ||
      (account && !account.username) ||
      (account && !account.password)
    ) {
      return state;
    }

    const { id } = account;

    // new account...
    if (!id) {
      let newId;
      const idCheck = acc => acc.id === newId;
      do {
        newId = uuidv4();
      } while (state.some(idCheck));

      account.id = newId;
      return [...state, account];
    }

    // existing account...
    return state.map(acc => {
      if (acc.id === id) {
        return account;
      }
      return acc;
    });
  }

  if (type === ACCOUNT_ACTIONS.DELETE_ACCOUNT) {
    const { account } = action;

    if (!account || (account && !account.id)) {
      return state;
    }

    return state.filter(acc => acc.id !== account.id);
  }

  return state;
}
