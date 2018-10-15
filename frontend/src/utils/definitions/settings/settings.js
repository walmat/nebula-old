import PropTypes from 'prop-types';

import proxy from './proxy';
import proxyErrors from './proxyErrors';
import defaults, { initialDefaultState } from './defaults';
import settingsErrors, { initialSettingsErrorState } from './settingsErrors';

export const initialSettingsState = {
  proxies: [],
  defaults: initialDefaultState,
  monitorDelay: 1500,
  errorDelay: 1500,
  discord: '',
  slack: '',
  errors: initialSettingsErrorState,
};

const settings = PropTypes.shape({
  proxies: PropTypes.arrayOf(proxy),
  proxyErrors,
  defaults,
  monitordelay: PropTypes.number,
  errorDelay: PropTypes.number,
  discord: PropTypes.string,
  slack: PropTypes.string,
  errors: settingsErrors,
});

export default settings;
