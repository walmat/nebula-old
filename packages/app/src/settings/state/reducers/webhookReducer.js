import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../store/actions';
import { CurrentWebhook } from '../initial';

export default function accountReducer(state = CurrentWebhook, action) {
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_WEBHOOK_NAME:
        return { ...state, name: action.value };
      case SETTINGS_FIELDS.EDIT_WEBHOOK_URL:
        return { ...state, username: action.value };
      default:
        return state;
    }
  }

  if (action.type === SETTINGS_ACTIONS.SELECT_WEBHOOK) {
    const { webhook } = action;

    // account without id means it hasn't been saved yet..
    if (!webhook || (webhook && !webhook.id) || (webhook && webhook.id === state.id)) {
      return state;
    }

    return webhook;
  }

  return state;
}
