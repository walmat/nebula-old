import { isEmpty } from 'lodash';
import { combineReducers } from 'redux';
import { filterActions } from 'redux-ignore';

// global actions
import { GLOBAL_ACTIONS } from '../actions';

// reducers
import App from '../../app/state/reducers';
import Sites from '../../app/state/reducers/sitesReducer';
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
    App: filterActions(App, action => action.type.match(/@@App|@@Global/)),
    Accounts: filterActions(Accounts, action =>
      action.type.match(/@@Accounts|@@Settings|@@Global/),
    ),
    CurrentAccount: filterActions(CurrentAccount, action =>
      action.type.match(/@@Accounts|@@Settings|@@Global/),
    ),
    CurrentProfile: filterActions(CurrentProfile, action =>
      action.type.match(/@@Profile|@@Global/),
    ),
    CurrentWebhook: filterActions(CurrentWebhook, action =>
      action.type.match(/@@Webhook|@@Settings|@@Global/),
    ),
    Delays: filterActions(Delays, action => action.type.match(/@@Delay/)),
    Navbar: filterActions(Navbar, action => action.type.match(/@@Navbar/)),
    SelectedProfile: filterActions(SelectedProfile, action =>
      action.type.match(/@@Profile|@@Global/),
    ),
    Profiles: filterActions(Profiles, action => action.type.match(/@@Profile|@@Global/)),
    Proxies: filterActions(Proxies, action => action.type.match(/@@Proxies|@@Global/)),
    Sites: filterActions(Sites, action => action.type.match(/@@App/)),
    Shipping: filterActions(Shipping, action =>
      action.type.match(/@@Shipping|@@Settings|@@Global/),
    ),
    Tasks: filterActions(Tasks, action => action.type.match(/@@Task|@@Global/)),
    CurrentTask: filterActions(CurrentTask, action => action.type.match(/@@Task|@@Global/)),
    SelectedTask: filterActions(SelectedTask, action => action.type.match(/@@Task|@@Global/)),
    Webhooks: filterActions(Webhooks, action => action.type.match(/@@Webhook|@@Settings|@@Global/)),
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
    // NOTE: This is NOT a mutation, just a re-assign.
    // eslint-disable-next-line no-param-reassign
    state = newState;
  }

  return reducers(state, action);
};
