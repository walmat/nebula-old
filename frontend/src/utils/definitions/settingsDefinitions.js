import PropTypes from 'prop-types';

import proxy from './settings/proxy';
import proxyErrors from './settings/proxyErrors';
import settingsErrors from './settings/settingsErrors';
import profile from './profiles/profile';
import profileList from './profiles/profileList';

export default {
  proxies: PropTypes.arrayOf(proxy),
  profileList,
  proxyErrors,
  defaultProfile: profile,
  defaultSizes: PropTypes.arrayOf({ value: PropTypes.string, label: PropTypes.string }),
  discord: PropTypes.string,
  slack: PropTypes.string,
  errors: settingsErrors,
};
