import PropTypes from 'prop-types';

import serverProperty from './serverProperty';

export const initialServerOptionsState = {
  type: null,
  size: null,
  location: null,
};

const serverOptions = PropTypes.shape({
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
});

export default serverOptions;
