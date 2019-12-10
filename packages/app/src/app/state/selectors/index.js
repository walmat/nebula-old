import { createSelector } from 'reselect';
import { App, Stores } from '../initial';

export const makeTheme = createSelector(
  state => state.App || App,
  state => state.theme || App.theme,
);

export const makeStores = createSelector(
  state => state.Sites || Stores,
  state => state || Stores,
);

export const makeShopifySites = createSelector(
  state => state.Sites || Stores,
  state => (state || Stores).filter(s => s.label === 'Shopify'),
);
