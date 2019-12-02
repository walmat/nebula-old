import { parseURL } from 'whatwg-url';
import {
  SHARED_ACTIONS,
  SHIPPING_ACTIONS,
  GLOBAL_ACTIONS,
  SETTINGS_FIELDS,
} from '../../../store/actions';
import { Shipping } from '../initial';

export default function shippingReducer(state = Shipping, action = {}) {
  const { type, field } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Shipping;
  }

  if (type === SHARED_ACTIONS.EDIT_SETTINGS) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT: {
        const { value, sites } = action;

        let change = {
          ...state.product,
          raw: value || '',
        };

        if (!value || !value.startsWith('http')) {
          return { ...state, product: { ...change } };
        }

        const URL = parseURL(value);
        if (!URL || !URL.host) {
          return { ...state, product: { ...change } };
        }
        let newSite;

        sites.forEach(category => {
          const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
          if (exists) {
            newSite = exists;
          }
        });

        if (!newSite || newSite.label === state.site.name) {
          return { ...state, product: { ...change } };
        }

        change = {
          ...change,
          site: {
            url: newSite.value,
            name: newSite.label,
            apiKey: newSite.apiKey,
          },
        };
        return { ...state, product: { ...change } };
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE: {
        const { value } = action;
        if (!value) {
          return { ...state, site: Shipping.site };
        }

        // if we're selecting the same site...
        if (state.site && value.name === state.site.name) {
          return state;
        }

        return { ...state, site: value };
      }
      default:
        return state;
    }
  }

  if (type === SHIPPING_ACTIONS.SETUP_SHIPPING) {
    const { message } = action;
    return { ...state, message, status: 'inprogress' };
  }

  if (type === SHIPPING_ACTIONS.CLEAR_SHIPPING) {
    return Shipping;
  }

  if (type === SHIPPING_ACTIONS.CLEANUP_SHIPPING) {
    const { message } = action;
    return { ...state, message, status: 'idle' };
  }

  return state;
}
