import { createSelector } from 'reselect';
import Navbar from '../initial';

// eslint-disable-next-line import/prefer-default-export
export const makeLocation = createSelector(
  state => state.Navbar || Navbar,
  state => state.location || Navbar.location,
);
