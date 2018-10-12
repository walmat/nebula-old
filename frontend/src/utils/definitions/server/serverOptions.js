import PropTypes from 'prop-types';

import serverProperty from './serverProperty';

export const initialServerOptionsState = {
  type: null,
  size: null,
  location: null,
  errors: {}, // TODO: Replace with initialServerOptionsErrorState (when it gets defined)
};

const serverOptions = PropTypes.shape({
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: Define this!
});

export default serverOptions;
