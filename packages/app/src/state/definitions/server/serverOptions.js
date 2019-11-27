import PropTypes from 'prop-types';

import serverProperty from './serverProperty';

const serverOptions = PropTypes.shape({
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: Define this!
});

export default serverOptions;
