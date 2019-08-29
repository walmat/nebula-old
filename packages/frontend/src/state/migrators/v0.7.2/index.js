import semver from 'semver';
import initialState from './state';

const updateShippingState = shipping => {
  const newShipping = shipping;

  delete newShipping.name;
  delete newShipping.username;
  delete newShipping.password;

  return newShipping;
};

export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.7.2') ? state.version : '0.7.2';

  const newState = {
    ...state,
    version: newVersion,
    settings: {
      ...state.settings,
      shipping: updateShippingState(state.settings.shipping),
      errors: updateShippingState(state.settings.shipping.errors),
    },
  };

  return newState;
};
