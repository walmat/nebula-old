import {
  SHARED_ACTIONS,
  WEBHOOK_ACTIONS,
  GLOBAL_ACTIONS,
  SETTINGS_FIELDS,
} from '../../../store/actions';
import { CurrentWebhook } from '../initial';

export default function webhookReducer(state = CurrentWebhook, action = {}) {
  const { type, field, value } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return CurrentWebhook;
  }

  if (type === SHARED_ACTIONS.EDIT_SETTINGS) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_WEBHOOK_NAME:
        return { ...state, name: value };
      case SETTINGS_FIELDS.EDIT_WEBHOOK_URL:
        return { ...state, username: value };
      default:
        return state;
    }
  }

  if (type === WEBHOOK_ACTIONS.SELECT_WEBHOOK) {
    const { webhook } = action;

    // account without id means it hasn't been saved yet..
    if (!webhook || (webhook && !webhook.id) || (webhook && webhook.id === state.id)) {
      return state;
    }

    return webhook;
  }

  return state;
}
