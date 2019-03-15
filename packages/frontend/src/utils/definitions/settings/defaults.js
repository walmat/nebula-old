import PropTypes from 'prop-types';

import pDefns, { initialProfileStates } from '../profileDefinitions';

const _defaultState = {
  profile: initialProfileStates.profile,
  sizes: [],
};

export const initialDefaultState = {
  ..._defaultState,
  edits: _defaultState,
  useProfile: false,
  useSizes: false,
};

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
