import { combineReducers } from 'redux';
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
  newTaskReducer as NewTask,
  selectedTaskReducer as SelectedTask,
  taskListReducer as Tasks,
} from '../../tasks/state/reducers';

const rootReducer = asyncReducers =>
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
    NewTask,
    SelectedTask,
    Webhooks,
    ...asyncReducers,
  });

export default rootReducer;
