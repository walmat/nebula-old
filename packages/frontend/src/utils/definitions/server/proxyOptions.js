import PropTypes from 'prop-types';

import { credentials } from './credentials';

const proxyOptions = PropTypes.shape({
  number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  credentials,
  location: PropTypes.shape({
    id: PropTypes.number,
    label: PropTypes.string,
    value: PropTypes.string,
  }),
  username: PropTypes.string,
  password: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: Define this!
});

export default proxyOptions;
