import { combineReducers } from 'redux';
import { filterActions } from 'redux-ignore';

// global actions
import {
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

export default asyncReducers =>
  combineReducers({
    App: filterActions(App, [...appActionsList, ...globalActionsList]),
    Accounts: filterActions(Accounts, [...accountActionsList, ...globalActionsList]),
    CurrentAccount: filterActions(CurrentAccount, [...accountActionsList, ...globalActionsList]),
    CurrentProfile: filterActions(CurrentProfile, [
      ...profileActionsList,
      ...shippingActionsList,
      ...globalActionsList,
    ]),
    CurrentWebhook: filterActions(CurrentWebhook, [...webhookActionsList, ...globalActionsList]),
    Delays: filterActions(Delays, [...delaysActionsList, ...globalActionsList]),
    Navbar: filterActions(Navbar, navbarActionsList),
    Profiles: filterActions(Profiles, [
      ...profileActionsList,
      ...shippingActionsList,
      ...globalActionsList,
    ]),
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
