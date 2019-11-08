import { combineReducers } from 'redux';

import { routerReducer as router } from 'react-router-redux';
import tasks from './reducers/tasks/taskListReducer';
import {
  newTaskReducer as newTask,
  selectedTaskReducer as selectedTask,
} from './reducers/tasks/taskReducer';
import {
  currentProfileReducer as currentProfile,
  selectedProfileReducer as selectedProfile,
} from './reducers/profiles/profileReducer';
import profiles from './reducers/profiles/profileListReducer';
import servers from './reducers/server/serverReducer';
import settings from './reducers/settings/settingsReducer';
import navbar from './reducers/navbar/navbarReducer';

const rootReducer = asyncReducers =>
  combineReducers({
    tasks,
    newTask,
    selectedTask,
    navbar,
    profiles,
    currentProfile,
    selectedProfile,
    settings,
    servers,
    router,
    ...asyncReducers,
  });

export default rootReducer;
