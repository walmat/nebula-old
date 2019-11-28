import prevState from '../v0.7.1/state';

const updateShippingState = shipping => {
  const newShipping = shipping;

  delete newShipping.name;
  delete newShipping.username;
  delete newShipping.password;

  return newShipping;
};

export default {
  ...prevState,
  version: '0.7.2',
  settings: {
    ...prevState.settings,
    shipping: updateShippingState(prevState.settings.shipping),
    errors: updateShippingState(prevState.settings.shipping.errors),
  },
};
