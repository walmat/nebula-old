export const location = {
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  country: {
    label: 'United States',
    value: 'US',
  },
  province: null,
  zip: '',
  phone: '',
  errors: {
    firstName: null,
    lastName: null,
    address: null,
    apt: null,
    city: null,
    country: null,
    province: null,
    zip: null,
    phone: null,
  },
};

export const payment = {
  email: '',
  card: '',
  exp: '',
  cvv: '',
  errors: {
    email: null,
    card: null,
    exp: null,
    cvv: null,
  },
};

export const Rates = [];

export const profile = {
  id: null,
  name: '',
  matches: false,
  shipping: location,
  billing: location,
  payment,
  errors: {
    name: null,
  },
};

export const CurrentProfile = { ...profile };
export const Profiles = [];
