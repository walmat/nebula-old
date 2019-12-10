import { WEBHOOK_ACTIONS, GLOBAL_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { CurrentWebhook } from '../initial';

export default function webhookReducer(state = CurrentWebhook, action = {}) {
  const { type, field, value } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return CurrentWebhook;
  }

  if (type === WEBHOOK_ACTIONS.EDIT_WEBHOOK) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_WEBHOOK_NAME:
        return { ...state, name: value };
      case SETTINGS_FIELDS.EDIT_WEBHOOK_URL:
        return { ...state, url: value };
      default:
        return state;
    }
  }

  if (type === WEBHOOK_ACTIONS.SELECT_WEBHOOK) {
    const { webhook } = action;

    // account without id means it hasn't been saved yet..
    if (!webhook || (webhook && webhook.id === state.id)) {
      return state;
    }

    return webhook;
  }

  if (type === WEBHOOK_ACTIONS.CREATE_WEBHOOK) {
    const { webhook } = action;

    if (!webhook || (webhook && (!webhook.url || !webhook.name))) {
      return state;
    }

    return CurrentWebhook;
  }

  if (type === WEBHOOK_ACTIONS.DELETE_WEBHOOK) {
    const { webhook } = action;

    if (!webhook || (webhook && !webhook.id) || (webhook && webhook.id !== state.id)) {
      return state;
    }

    return CurrentWebhook;
  }

  return state;
}
