/* global describe it expect */
import { NAVBAR_ACTIONS, ROUTES } from '../../../state/actions';
import { navbarReducer, initialNavbarState } from '../../../state/reducers/navbar/navbarReducer';

describe('navbar reducer', () => {
  it('should return an initial state', () => {
    const expected = initialNavbarState;
    const actual = navbarReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  it('should handle a generic route action', () => {
    const start = {
      ...initialNavbarState,
      location: '/test',
    };
    const expected = {
      ...initialNavbarState,
      location: '/test',
    };
    const actual = navbarReducer(start, { type: 'GENERIC_ROUTE' });
    expect(actual).toEqual(expected);
  });

  it('should handle a route tasks action', () => {
    const expected = {
      ...initialNavbarState,
      location: ROUTES.TASKS,
    };
    const actual = navbarReducer(undefined, { type: NAVBAR_ACTIONS.ROUTE_TASKS });
    expect(actual).toEqual(expected);
  });

  it('should handle a route profiles action', () => {
    const expected = {
      ...initialNavbarState,
      location: ROUTES.PROFILES,
    };
    const actual = navbarReducer(undefined, { type: NAVBAR_ACTIONS.ROUTE_PROFILES });
    expect(actual).toEqual(expected);
  });

  it('should handle a route server action', () => {
    const expected = {
      ...initialNavbarState,
      location: ROUTES.SERVER,
    };
    const actual = navbarReducer(undefined, { type: NAVBAR_ACTIONS.ROUTE_SERVER });
    expect(actual).toEqual(expected);
  });

  it('should handle a route settings action', () => {
    const expected = {
      ...initialNavbarState,
      location: ROUTES.SETTINGS,
    };
    const actual = navbarReducer(undefined, { type: NAVBAR_ACTIONS.ROUTE_SETTINGS });
    expect(actual).toEqual(expected);
  });
});
