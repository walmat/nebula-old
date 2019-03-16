import { SETTINGS_FIELDS } from '../../state/actions';
import regexes from '../validation';

function validateDiscordWebhook(input) {
  return input && regexes.discordWebhook.test(input);
}

function validateSlackWebhook(input) {
  return input && regexes.slackWebhook.test(input);
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_DISCORD]: validateDiscordWebhook,
  [SETTINGS_FIELDS.EDIT_SLACK]: validateSlackWebhook,
};

export default settingsAttributeValidatorMap;
