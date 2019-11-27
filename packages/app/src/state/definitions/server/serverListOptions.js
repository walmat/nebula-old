import PropTypes from 'prop-types';

import serverProperty from './serverProperty';

const serverListOptions = PropTypes.shape({
  types: PropTypes.arrayOf(serverProperty),
  sizes: PropTypes.arrayOf(serverProperty),
  locations: PropTypes.arrayOf(serverProperty),
});

export default serverListOptions;
