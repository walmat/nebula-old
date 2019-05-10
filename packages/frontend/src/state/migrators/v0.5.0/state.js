import prevState from '../v0.4.0/state';

const DSMLRates = {
  US: {
    rate: 'shopify-Express%201-3%20working%20days%20from%20dispatch-20.00',
    price: '20.00',
    name: 'Express 1-3 Working Days From Dispatch',
  },
  UK: {
    rate: 'shopify-Express%201-2%20working%20days%20from%20dispatch-5.00',
    price: '5.00',
    name: 'Express 1-2 Working Days From Dispatch',
  },
  // any country that isn't the UK that's a part of the EU
  EU: {
    rate: 'shopify-Express%201-2%20working%20days%20from%20dispatch-15.00',
    price: '15.00',
    name: 'Express 1-2 Working Days From Dispatch',
  },
  SG: {
    rate: 'shopify-Express%202-4%20working%20days%20from%20dispatch-25.00',
    price: '25.00',
    name: 'Express 2-4 Working Days From Dispatch',
  },
  // any country that isn't SG that's inside of ASIA
  ASIA: {
    rate: 'shopify-Express%202-4%20working%20days%20from%20dispatch-25.00',
    price: '25.00',
    name: 'Express 2-4 Working Days From Dispatch',
  },
};

const updateProfile = profile => {
  if (!profile.shipping || !profile.shipping.country) {
    return profile;
  }

  const rate = DSMLRates[profile.shipping.country.value];

  // we're safe to push it onto the array, because even if it's empty it will be the first index
  return {
    ...profile,
    rates: profile.rates.push({
      site: {
        name: 'DSM UK',
        url: 'https://eflash.doverstreetmarket.com',
      },
      rates: [rate],
      selectedRate: rate,
    }),
  };
};

const newState = {
  ...prevState,
  version: '0.5.0',
  profiles: prevState.profiles.map(updateProfile),
  selectedProfile: updateProfile(prevState.selectedProfile),
  currentProfile: updateProfile(prevState.currentProfile),
  // TODO: update tasks profile references as well
};

export default newState;
