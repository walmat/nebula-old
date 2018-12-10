import PropTypes from 'prop-types';

import pDefns, { initialProfileStates } from '../profileDefinitions';

const _defaultState = {
  profile: initialProfileStates.profile,
  sizes: [],
};

export const initialDefaultState = {
  ..._defaultState,
  edits: _defaultState,
};

const _defaultsShape = {
  profile: pDefns.profile,
  sizes: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string,
    }),
  ),
};

const defaults = PropTypes.shape({
  ..._defaultsShape,
  edits: PropTypes.shape(_defaultsShape),
});

export default defaults;
