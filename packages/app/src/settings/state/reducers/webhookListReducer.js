import uuidv4 from 'uuid/v4';

import { WEBHOOK_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Webhooks } from '../initial';

export default function webhookListReducer(state = Webhooks, action = {}) {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Webhooks;
  }

  if (type === WEBHOOK_ACTIONS.ADD_WEBHOOK) {
    const { webhook } = action;

    // new webhook...
    if (!webhook.id) {
      let newId;
      const idCheck = acc => acc.id === newId;
      do {
        newId = uuidv4();
      } while (state.some(idCheck));

      webhook.id = newId;
      return state.push(webhook);
    }

    // existing account...
    return state.map(hook => {
      if (hook.id === webhook.id) {
        return webhook;
      }
      return hook;
    });
  }

  if (type === WEBHOOK_ACTIONS.DELETE_WEBHOOK) {
    const { webhook } = action;

    if (!webhook || (webhook && !webhook.id)) {
      return state;
    }

    return state.filter(hook => hook.id !== webhook.id);
  }

  return state;
}
