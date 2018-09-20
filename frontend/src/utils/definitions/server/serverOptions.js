import PropTypes from 'prop-types';

import serverLocation from './serverLocation';
import serverSize from './serverSize';
import serverType from './serverType';

export const initialServerOptionsState = {
  type: null,
  size: null,
  location: null,
};

const serverOptions = PropTypes.shape({
  type: serverType,
  size: serverSize,
  location: serverLocation,
});

export default serverOptions;
