import { createSelector } from 'reselect';
import {
  Accounts,
  CurrentAccount,
  CurrentWebhook,
  Delays,
  Proxies,
  Shipping,
  Webhooks,
} from '../initial';

export const makeAccounts = createSelector(
  state => state.Accounts || Accounts,
  state => state || Accounts,
);

export const makeCurrentAccount = createSelector(
  state => state.CurrentAccount || CurrentAccount,
  state => state || CurrentAccount,
);

export const makeCurrentWebhook = createSelector(
  state => state.CurrentWebhook || CurrentWebhook,
  state => state || CurrentWebhook,
);

export const makeDelays = createSelector(
  state => state.Delays || Delays,
  state => state || Delays,
);

export const makeProxies = createSelector(
  state => state.Proxies || Proxies,
  state => state || Proxies,
);

export const makeShipping = createSelector(
  state => state.Shipping || Shipping,
  state => state || Shipping,
);

export const makeWebhooks = createSelector(
  state => state.Webhooks || Webhooks,
  state => state || Webhooks,
);
