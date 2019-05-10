import prevState from '../v0.4.0/state';
import dsmlRates from '../../../constants/dsmlRates';

const updateProfile = profile => {
  if (!profile.shipping || !profile.shipping.country) {
    return profile;
  }

  const rate = dsmlRates[profile.shipping.country.value];

  if (!rate) {
    return profile;
  }

  const newRates =
    profile.rates && profile.rates.length
      ? profile.rates.push({
          site: {
            name: 'DSM UK',
            url: 'https://eflash.doverstreetmarket.com',
          },
          rates: [rate],
          selectedRate: rate,
        })
      : [
          {
            site: {
              name: 'DSM UK',
              url: 'https://eflash.doverstreetmarket.com',
            },
            rates: [rate],
            selectedRate: rate,
          },
        ];

  return {
    ...profile,
    rates: newRates,
  };
};

const updateTask = task => {
  if (!task.profile || !task.profile.shipping.country) {
    return task;
  }

  const rate = dsmlRates[task.profile.shipping.country.value];

  if (!rate) {
    return task;
  }

  const newRates =
    task.profile.rates && task.profile.rates.length
      ? task.profile.rates.push({
          site: {
            name: 'DSM UK',
            url: 'https://eflash.doverstreetmarket.com',
          },
          rates: [rate],
          selectedRate: rate,
        })
      : [
          {
            site: {
              name: 'DSM UK',
              url: 'https://eflash.doverstreetmarket.com',
            },
            rates: [rate],
            selectedRate: rate,
          },
        ];

  return {
    ...task,
    profile: {
      ...task.profile,
      rates: newRates,
    },
  };
};

const newState = {
  ...prevState,
  version: '0.5.0',
  profiles: prevState.profiles.map(updateProfile),
  selectedProfile: updateProfile(prevState.selectedProfile),
  currentProfile: updateProfile(prevState.currentProfile),
  tasks: prevState.tasks.map(updateTask),
  newTask: updateTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
};

export default newState;
