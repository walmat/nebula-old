import prevState from '../v0.4.0/state';
import dsmlRates from '../../../constants/dsmlRates';

const updateProfile = profile => {
  if (!profile.shipping || !profile.shipping.country) {
    return profile;
  }

  const rate = dsmlRates[profile.shipping.country.value];

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
