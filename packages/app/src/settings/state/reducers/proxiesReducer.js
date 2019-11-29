import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { Proxies } from '../initial';

export default function proxiesReducer(state = Proxies, action) {
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
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
