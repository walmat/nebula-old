import PropTypes from 'prop-types';

import pDefns from '../profileDefinitions';
import initialProfileStates from '../../../state/initial/profiles';
import shippingManagerErrors, { initialShippingManagerErrorState } from './shippingManagerErrors';

export const initialShippingManagerState = {
  name: '',
  profile: initialProfileStates.profile,
  site: {
    name: null,
    url: null,
    supported: null,
    apiKey: null,
    auth: null,
  },
  product: {
    raw: '',
    variant: null,
    pos_keywords: null,
    neg_keywords: null,
    url: null,
  },
  username: '',
  password: '',
  errors: initialShippingManagerErrorState,
};

const shippingManager = PropTypes.shape({
  name: PropTypes.string,
  profile: pDefns.profile,
  site: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    supported: PropTypes.bool,
    apiKey: PropTypes.string,
    auth: PropTypes.bool,
  }),
  product: PropTypes.shape({
    raw: PropTypes.string,
    variant: PropTypes.string,
    pos_keywords: PropTypes.arrayOf(PropTypes.string),
    neg_keywords: PropTypes.arrayOf(PropTypes.string),
    url: PropTypes.string,
  }),
  username: PropTypes.string,
  password: PropTypes.string,
  errors: shippingManagerErrors,
});

export default shippingManager;
