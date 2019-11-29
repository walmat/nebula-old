import { parseURL } from 'whatwg-url';
import { SETTINGS_ACTIONS, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../../store/actions';
import { Shipping } from '../initial';

export default function shippingReducer(state = Shipping, action) {
  console.log('shipping reducer handling action: ', action);

  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT: {
        change = {
          product: {
            ...state.product,
            raw: action.value || '',
          },
          errors: Object.assign({}, state.errors, action.errors),
        };

        if (!action.value || !action.value.startsWith('http')) {
          break;
        }
        const URL = parseURL(action.value);
        if (!URL || !URL.host) {
          break;
        }
        let newSite;
        const { sites } = action;

        sites.forEach(category => {
          const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
          if (exists) {
            newSite = exists;
          }
        });

        if (!newSite || newSite.label === state.site.name) {
          break;
        }

        change = {
          ...change,
          site: {
            url: newSite.value,
            name: newSite.label,
            apiKey: newSite.apiKey,
          },
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE: {
        if (action.value) {
          if (state.site && action.value.name && action.value.name === state.site.name) {
            break;
          }
          change = {
            site: action.value,
            errors: Object.assign({}, state.errors, action.errors),
          };
        } else {
          change = {
            site: Shipping.site,
          };
        }
        break;
      }
      default: {
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
      }
    }
  }
  return Object.assign({}, state, change);
}
