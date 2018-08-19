import PropTypes from 'prop-types';

import proxy from './settings/proxy';
import proxyErrors from './settings/proxyErrors';
import settingsErrors from './settings/settingsErrors';
import profile from './profiles/profile';
import profileList from './profiles/profileList';

export default {
  proxies: PropTypes.arrayOf(proxy),
  profileList,
  profile,
  proxyErrors,

  errors: settingsErrors,
};
