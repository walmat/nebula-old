import { SHARED_ACTIONS, GLOBAL_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { Proxies } from '../initial';

export default function proxiesReducer(state = Proxies, action = {}) {
  const { type, field } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Proxies;
  }

  if (type === SHARED_ACTIONS.EDIT) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_PROXIES: {
        const { proxies } = action;

        // if we aren't receiving any proxies
        // or if we aren't connected to the preload
        // just return the current proxies list
        if (!proxies || !window.Bridge) {
          return state;
        }

        const removed = state.filter(p => !proxies.includes(p));
        const added = proxies.filter(p => !state.includes(p));

        if (removed.length) {
          window.Bridge.removeProxies(removed);
        }

        if (added.length) {
          window.Bridge.addProxies(added);
        }

        // return the new proxies array...
        return proxies;
      }
      default:
        return state;
    }
  }

  return state;
}
