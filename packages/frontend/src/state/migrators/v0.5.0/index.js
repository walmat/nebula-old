import semver from 'semver';

import initialState from './state';
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

  // we're safe to push it onto the array, because even if it's empty it will be the first index
  return {
    ...profile,
    rates: newRates,
  };
};

const updateTask = task => {
  if (!task.profile.id) {
    return task;
  }

  // country will default to US so we don't have to check here
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

/**
 * v0.5.0 Migrator
 *
 * A migrator is a special type of reducer that accepts a given state
 * and returns the necessary changes to make it a valid state for the
 * version associated with the migrator.
 *
 * The v0.5.0 Migrator filters out all task instances that don't have a valid id
 *
 * @param {*} state a v0.4.0 state
 * @returns a valid v0.5.0 state
 */
export default (state = initialState) => {
  const newVersion = semver.gt(state.version, '0.5.0') ? state.version : '0.5.0';
  return {
    ...state,
    version: newVersion,
    profiles: state.profiles.map(updateProfile),
    currentProfile: updateProfile(state.currentProfile),
    selectedProfile: updateProfile(state.selectedProfile),
    tasks: state.tasks.map(updateTask),
    newTask: updateTask(state.newTask),
    selectedTask: updateTask(state.selectedTask),
  };
};
