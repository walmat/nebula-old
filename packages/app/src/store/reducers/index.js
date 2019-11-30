import { isEmpty } from 'lodash';
import { combineReducers } from 'redux';

// global actions
import { GLOBAL_ACTIONS } from '../actions';

// reducers
import App from '../../app/state/reducers';
import Navbar from '../../navbar/state/reducers';
import {
  currentProfileReducer as CurrentProfile,
  profileListReducer as Profiles,
  selectedProfileReducer as SelectedProfile,
} from '../../profiles/state/reducers';
import {
  accountListReducer as Accounts,
  accountReducer as CurrentAccount,
  delayReducer as Delays,
  proxiesReducer as Proxies,
  shippingReducer as Shipping,
  webhookListReducer as Webhooks,
  webhookReducer as CurrentWebhook,
} from '../../settings/state/reducers';

import {
  taskListReducer as Tasks,
  currentTaskReducer as CurrentTask,
  selectedTaskReducer as SelectedTask,
} from '../../tasks/state/reducers';

const reducers = asyncReducers =>
  combineReducers({
    App,
    Accounts,
    CurrentAccount,
    CurrentProfile,
    CurrentWebhook,
    Delays,
    Navbar,
    SelectedProfile,
    Profiles,
    Proxies,
    Shipping,
    Tasks,
    CurrentTask,
    SelectedTask,
    Webhooks,
    ...asyncReducers,
  });

// Wrapped context to allow global actions
// e.g. - reset, import, etc..
export default (state, action) => {
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
    // NOTE: This is NOT a mutation, just a re-assign.
    // eslint-disable-next-line no-param-reassign
    state = newState;
  }

  return reducers(state, action);
};
