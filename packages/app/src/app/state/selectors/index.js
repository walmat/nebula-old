import { createSelector } from 'reselect';
import { App, Sites } from '../initial';

export const makeTheme = createSelector(
  state => state.App || App,
  state => state.App.theme || App.theme,
);

export const makeSites = createSelector(
  state => state.Sites || Sites,
  state => state || Sites,
);

export const makeShopifySites = createSelector(
  state => state.Sites || Sites,
  state => (state || Sites).filter(s => s.label === 'Shopify'),
);
