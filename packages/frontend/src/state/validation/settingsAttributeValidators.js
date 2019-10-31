import { SETTINGS_FIELDS } from '../actions';
import regexes from '../utils/regexes';

function validateDiscordWebhook(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }
  return input && regexes.discordWebhook.test(input);
}

function validateSlackWebhook(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }
  return input && regexes.slackWebhook.test(input);
}

function validateEmail(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }
  return input && regexes.email.test(input);
}

function validateNonEmpty(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }
  return input;
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_DISCORD]: validateDiscordWebhook,
  [SETTINGS_FIELDS.EDIT_SLACK]: validateSlackWebhook,
  [SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME]: validateEmail,
  [SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD]: validateNonEmpty,
  [SETTINGS_FIELDS.EDIT_ACCOUNT_NAME]: validateNonEmpty,
};

export default settingsAttributeValidatorMap;
