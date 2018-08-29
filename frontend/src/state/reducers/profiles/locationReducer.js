export const initialLocationState = {
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  country: null,
  state: null,
  zipCode: '',
  phone: '',
  errors: {
    firstName: null,
    lastName: null,
    address: null,
    apt: null,
    city: null,
    country: null,
    state: null,
    zipCode: null,
    phone: null,
  },
};

export const locationReducer = (state = initialLocationState, action) => {
  let change = {};
  switch (action.type) {
    default: {
      change = {
        [action.type]: action.value,
      };
      break;
    }
  }
  change.errors = action.errors;
  return Object.assign({}, state, change);
};
