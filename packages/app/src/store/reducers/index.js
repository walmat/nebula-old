import { combineReducers } from 'redux';
import App from '../../app/reducers';
import Navbar from '../../navbar/reducers';
import {
  currentProfileReducer as CurrentProfile,
  profileListReducer as Profiles,
  selectedProfileReducer as SelectedProfile,
} from '../../profiles/reducers';
import Server from '../../server/reducers';
import Settings from '../../settings/reducers/settingsReducer';
import {
  newTaskReducer as NewTask,
  selectedTaskReducer as SelectedTask,
  taskListReducer as Tasks,
} from '../../tasks/reducers';

const rootReducer = asyncReducers =>
  combineReducers({
    App,
    Navbar,
    CurrentProfile,
    SelectedProfile,
    Profiles,
    Server,
    Settings,
    Tasks,
    NewTask,
    SelectedTask,
    ...asyncReducers,
  });

export default rootReducer;
