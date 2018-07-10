import PropTypes from 'prop-types';

import serverLocation from './serverLocation';
import serverSize from './serverSize';
import serverType from './serverType';

const serverListOptions = PropTypes.shape({
  types: PropTypes.arrayOf(serverType),
  sizes: PropTypes.arrayOf(serverSize),
  locations: PropTypes.arrayOf(serverLocation),
});

export default serverListOptions;
