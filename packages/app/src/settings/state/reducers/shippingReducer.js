import { parseURL } from 'whatwg-url';
import { SHIPPING_ACTIONS, PROFILE_ACTIONS, GLOBAL_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { Shipping } from '../initial';

export default function shippingReducer(state = Shipping, action = {}) {
  const { type, field } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Shipping;
  }

  if (type === SHIPPING_ACTIONS.EDIT_SHIPPING) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT: {
        const { value, sites } = action;

        let change = {
          ...state,
          product: {
            ...state.product,
            raw: value || '',
          },
        };

        if (!value || !value.startsWith('http')) {
          return { ...state, ...change };
        }

        const URL = parseURL(value);
        if (!URL || !URL.host) {
          return { ...state, ...change };
        }
        let newStore;

        sites.forEach(category => {
          const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
          if (exists) {
            newStore = exists;
          }
        });

        if (!newStore || (newStore.label && state.store && newStore.label === state.store.name)) {
          return { ...state, ...change };
        }

        change = {
          ...change,
          store: {
            url: newStore.value,
            name: newStore.label,
            apiKey: newStore.apiKey,
          },
        };
        return { ...state, ...change };
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_STORE: {
        const { value } = action;
        if (!value) {
          return { ...state, store: Shipping.store };
        }

        // if we're selecting the same site...
        if (state.store && value.name === state.store.name) {
          return state;
        }

        return { ...state, store: value };
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE: {
        const { value } = action;

        if (!value) {
          return state;
        }

        return { ...state, profile: value };
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

  if (type === PROFILE_ACTIONS.REMOVE_PROFILE) {
    const { id } = action;

    if (!id || !state.profile || id !== state.profile.id) {
      return state;
    }

    return { ...state, profile: null };
  }

  return state;
}
