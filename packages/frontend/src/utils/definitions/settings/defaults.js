import PropTypes from 'prop-types';

import pDefns from '../profileDefinitions';

const _defaultsShape = {
  profile: pDefns.profile,
  sizes: PropTypes.arrayOf(PropTypes.string),
};

const defaults = PropTypes.shape({
  ..._defaultsShape,
  edits: PropTypes.shape(_defaultsShape),
  useProfile: PropTypes.bool,
  useSizes: PropTypes.bool,
});

export default defaults;
