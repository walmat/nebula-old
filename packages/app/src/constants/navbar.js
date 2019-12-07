import { ROUTES, NAVBAR_ACTIONS } from '../store/actions';

import { ReactComponent as TasksIcon } from '../styles/images/navbar/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../styles/images/navbar/profiles.svg';
import { ReactComponent as SettingsIcon } from '../styles/images/navbar/settings.svg';

const classNameCalc = (...supportedRoutes) => route =>
  supportedRoutes.includes(route) ? 'active' : null;

export default {
  [NAVBAR_ACTIONS.ROUTE_TASKS]: {
    Icon: TasksIcon,
    iconName: 'tasks',
    classNameGenerator: classNameCalc(ROUTES.TASKS, '/'),
  },
  [NAVBAR_ACTIONS.ROUTE_PROFILES]: {
    Icon: ProfilesIcon,
    iconName: 'profiles',
    classNameGenerator: classNameCalc(ROUTES.PROFILES),
  },
  [NAVBAR_ACTIONS.ROUTE_SETTINGS]: {
    Icon: SettingsIcon,
    iconName: 'settings',
    classNameGenerator: classNameCalc(ROUTES.SETTINGS),
  },
};
