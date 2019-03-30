import prevState from '../v0.2.0/state';

const newState = {
  ...prevState,
  version: '0.2.1',
  settings: {
    ...prevState.settings,
    shipping: {
      ...prevState.settings.shipping,
      status: 'idle',
    },
  },
};

export default newState;
