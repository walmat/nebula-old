import { parseURL } from 'whatwg-url';
import { SETTINGS_ACTIONS, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../actions';
import getAllSites from '../../../constants/getAllSites';
import initialSettingsStates from '../../initial/settings';

export default function shippingReducer(state = initialSettingsStates.shipping, action) {
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
        const newSite = getAllSites().find(s => URL.host === parseURL(s.value).host);
        if (!newSite || newSite.label === state.site.name) {
          break;
        }

        change = {
          ...change,
          site: {
            url: newSite.value,
            name: newSite.label,
            apiKey: newSite.apiKey,
            special: newSite.special || false,
            auth: newSite.auth,
          },
          username: '',
          password: '',
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
            username: '',
            password: '',
            errors: Object.assign({}, state.errors, action.errors),
          };
        } else {
          change = {
            site: initialSettingsStates.shipping.site,
            username: initialSettingsStates.shipping.username,
            password: initialSettingsStates.shipping.password,
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
