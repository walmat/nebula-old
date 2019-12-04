import { createSelector } from 'reselect';
import { CurrentProfile, Profiles, Rates } from '../initial';

export const makeCurrentProfile = createSelector(
  state => state.CurrentProfile || CurrentProfile,
  state => state || CurrentProfile,
);

export const makeProfiles = createSelector(
  state => state.Profiles || Profiles,
  state => state || Profiles,
);

export const makeRates = createSelector(
  state => state.Rates || Rates,
  state => state || Rates,
);
