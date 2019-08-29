import { SETTINGS_FIELDS } from '../../state/actions';
import regexes from '../validation';

function validateDiscordWebhook(input) {
  return input && regexes.discordWebhook.test(input);
}

function validateSlackWebhook(input) {
  return input && regexes.slackWebhook.test(input);
}

function validateEmail(input) {
  return input && regexes.email.test(input);
}

function validateNonEmpty(input) {
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
