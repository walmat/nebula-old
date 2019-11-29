import { parseURL } from 'whatwg-url';
import { SETTINGS_ACTIONS, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../../store/actions';
import { Shipping } from '../initial';

export default function shippingReducer(state = Shipping, action) {
  console.log('shipping reducer handling action: ', action);

  const { type, field } = action;

  if (type === SETTINGS_ACTIONS.EDIT) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT: {
        const { value, sites } = action;

        let change = {
          ...state.product,
          raw: value || '',
        };

        if (!value || !value.startsWith('http')) {
          return { ...state, ...change };
        }

        const URL = parseURL(value);
        if (!URL || !URL.host) {
          return { ...state, ...change };
        }
        let newSite;

        sites.forEach(category => {
          const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
          if (exists) {
            newSite = exists;
          }
        });

        if (!newSite || newSite.label === state.site.name) {
          return { ...state, ...change };
        }

        change = {
          ...change,
          site: {
            url: newSite.value,
            name: newSite.label,
            apiKey: newSite.apiKey,
          },
        };
        return { ...state, ...change };
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE: {
        const { value } = action;
        if (!value) {
          return { ...state, site: Shipping.site };
        }

        // if we're selecting the same site...
        if (value.name === state.site.name) {
          return state;
        }

        return { ...state, site: value };
      }
      default:
        return { ...state, [mapSettingsFieldToKey[action.field]]: action.value };
    }
  }

  if (type === SETTINGS_ACTIONS.SETUP_SHIPPING) {
    const { message } = action;
    return { ...state, message, status: 'inprogress' };
  }

  if (type === SETTINGS_ACTIONS.CLEAR_SHIPPING) {
    return Shipping;
  }

  if (type === SETTINGS_ACTIONS.CLEANUP_SHIPPING) {
    const { message } = action;
    return { ...state, message, status: 'idle' };
  }

  return state;
}
