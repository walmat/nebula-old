import uuidv4 from 'uuid/v4';

import { WEBHOOK_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Webhooks } from '../initial';

import { HookTypes } from '../../../constants';

const getWebhookType = url => {
  if (
    url &&
    /https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/.test(url)
  ) {
    return HookTypes.slack;
  }

  if (url && /https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*/.test(url)) {
    return HookTypes.discord;
  }

  return null;
};

export default function webhookListReducer(state = Webhooks, action = {}) {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Webhooks;
  }

  if (type === WEBHOOK_ACTIONS.CREATE_WEBHOOK) {
    const { webhook } = action;

    if (!webhook || (webhook && (!webhook.url || !webhook.name))) {
      return state;
    }

    const hookType = getWebhookType(webhook.url);
    webhook.type = hookType;

    // new webhook...
    if (!webhook.id) {
      let newId;
      const idCheck = acc => acc.id === newId;
      do {
        newId = uuidv4();
      } while (state.some(idCheck));

      webhook.id = newId;
      window.Bridge.addWebhooks([webhook]);
      return [...state, webhook];
    }

    // existing webhook...
    return state.map(hook => {
      if (hook.id === webhook.id) {
        window.Bridge.addWebhooks([webhook]);
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

    window.Bridge.removeWebhooks([webhook]);

    return state.filter(hook => hook.id !== webhook.id);
  }

  return state;
}
