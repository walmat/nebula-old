import PropTypes from 'prop-types';

import proxy from './proxy';
import proxyErrors from './proxyErrors';
import defaults, { initialDefaultState } from './defaults';
import settingsErrors, { initialSettingsErrorState } from './settingsErrors';

export const initialSettingsState = {
  proxies: [],
  defaults: initialDefaultState,
  discord: '',
  slack: '',
  errors: initialSettingsErrorState,
};

const settings = PropTypes.shape({
  proxies: PropTypes.arrayOf(proxy),
  proxyErrors,
  defaults,
  discord: PropTypes.string,
  slack: PropTypes.string,
  errors: settingsErrors,
});

export default settings;
