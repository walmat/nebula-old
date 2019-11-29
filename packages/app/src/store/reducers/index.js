import { combineReducers } from 'redux';
import App from '../../app/state/reducers';
import Navbar from '../../navbar/state/reducers';
import {
  currentProfileReducer as CurrentProfile,
  profileListReducer as Profiles,
  selectedProfileReducer as SelectedProfile,
} from '../../profiles/state/reducers';
import {
  settingsReducer as Settings,
  shippingReducer as Shipping,
} from '../../settings/state/reducers';
import {
  newTaskReducer as NewTask,
  selectedTaskReducer as SelectedTask,
  taskListReducer as Tasks,
} from '../../tasks/state/reducers';

const rootReducer = asyncReducers =>
  combineReducers({
    App,
    Navbar,
    CurrentProfile,
    SelectedProfile,
    Profiles,
    Settings,
    Shipping,
    Tasks,
    NewTask,
    SelectedTask,
    ...asyncReducers,
  });

export default rootReducer;
