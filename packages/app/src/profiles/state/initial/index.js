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
};

export const payment = {
  email: '',
  card: '',
  exp: '',
  cvv: '',
};

export const Rates = [];

export const profile = {
  id: null,
  name: '',
  matches: false,
  shipping: location,
  billing: location,
  payment,
};

export const CurrentProfile = { ...profile };
export const Profiles = [];
