import { PROXIES_ACTIONS, GLOBAL_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { Proxies } from '../initial';

export default function proxiesReducer(state = Proxies, action = {}) {
  const { type, field } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Proxies;
  }

  if (type === PROXIES_ACTIONS.EDIT_PROXIES) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_PROXIES: {
        const { value } = action;

        // if we aren't receiving any proxies
        // or if we aren't connected to the preload
        // just return the current proxies list
        if (!value || !window.Bridge) {
          return state;
        }

        const removed = state.filter(p => !value.includes(p));
        const added = value.filter(p => !state.includes(p));

        if (removed.length) {
          window.Bridge.removeProxies(removed);
        }

        if (added.length) {
          window.Bridge.addProxies(added);
        }

        // return the new proxies array...
        return value;
      }
      default:
        return state;
    }
  }

  return state;
}
