import { isEmpty } from 'lodash';
import { combineReducers } from 'redux';
import { filterActions } from 'redux-ignore';

// global actions
import {
  GLOBAL_ACTIONS,
  globalActionsList,
  accountActionsList,
  appActionsList,
  navbarActionsList,
  profileActionsList,
  profileActionsNeededForTask,
  delaysActionsList,
  proxiesActionsList,
  shippingActionsList,
  taskActionsList,
  taskListActionsList,
  webhookActionsList,
} from '../actions';

// reducers
import App from '../../app/state/reducers';
import Sites from '../../app/state/reducers/sitesReducer';
import Navbar from '../../navbar/state/reducers';
import {
  currentProfileReducer as CurrentProfile,
  profileListReducer as Profiles,
} from '../../profiles/state/reducers';
import {
  accountListReducer as Accounts,
  accountReducer as CurrentAccount,
  delayReducer as Delays,
  proxyListReducer as Proxies,
  shippingReducer as Shipping,
  webhookListReducer as Webhooks,
  webhookReducer as CurrentWebhook,
} from '../../settings/state/reducers';

import {
  taskListReducer as Tasks,
  currentTaskReducer as CurrentTask,
} from '../../tasks/state/reducers';

const reducers = asyncReducers =>
  combineReducers({
    App: filterActions(App, [...appActionsList, ...globalActionsList]),
    Accounts: filterActions(Accounts, [...accountActionsList, ...globalActionsList]),
    CurrentAccount: filterActions(CurrentAccount, [...accountActionsList, ...globalActionsList]),
    CurrentProfile: filterActions(CurrentProfile, [...profileActionsList, ...globalActionsList]),
    CurrentWebhook: filterActions(CurrentWebhook, [...webhookActionsList, ...globalActionsList]),
    Delays: filterActions(Delays, [...delaysActionsList, ...globalActionsList]),
    Navbar: filterActions(Navbar, navbarActionsList),
    Profiles: filterActions(Profiles, [...profileActionsList, ...globalActionsList]),
    Proxies: filterActions(Proxies, [...proxiesActionsList, ...globalActionsList]),
    Sites: filterActions(Sites, appActionsList),
    Shipping: filterActions(Shipping, [...shippingActionsList, ...globalActionsList]),
    Tasks: filterActions(Tasks, [
      ...taskListActionsList,
      ...profileActionsNeededForTask,
      ...globalActionsList,
    ]),
    CurrentTask: filterActions(CurrentTask, [
      ...taskActionsList,
      ...profileActionsNeededForTask,
      ...globalActionsList,
    ]),
    Webhooks: filterActions(Webhooks, [...webhookActionsList, ...globalActionsList]),
    ...asyncReducers,
  });

// Wrapped context to allow global actions
// e.g. - reset, import, etc..
export default (state = undefined, action = {}) => {
  const { type } = action;
  if (type === GLOBAL_ACTIONS.RESET) {
    // Forces a state refresh here to the initial state of each reducer
    // NOTE: This is NOT a mutation, just a re-assign.
    // eslint-disable-next-line no-param-reassign
    state = undefined;
  }

  if (type === GLOBAL_ACTIONS.IMPORT) {
    const { state: newState } = action;

    // if we aren't given a new state
    // or the new state is empty
    // of if we have an improper version..
    if (!newState || isEmpty(newState) || (newState && !newState.version)) {
      return reducers(state, action);
    }
    // TODO: Migrations
    // NOTE: This is NOT a mutation, just a direct re-assign.
    // eslint-disable-next-line no-param-reassign
    state = newState;
  }

  return reducers(state, action);
};
