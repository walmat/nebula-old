import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import sDefns from '../utils/definitions/settingsDefinitions';

export class WebhooksPrimitive extends Component {
  createOnChangeHandler(field) {
    const { onSettingsChange } = this.props;
    return event => {
      onSettingsChange({
        field,
        value: event.target.value,
      });
    };
  }

  render() {
    const { settings, errors, onTestDiscord, onTestSlack, onKeyPress } = this.props;
    const { discord, slack } = settings;
    return (
      <div>
        <div className="row row--start row-gutter">
          <div className="col">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="settings__label">Discord URL</p>
                <input
                  className="settings__input-group--webhook__discord"
                  placeholder="https://discordapp.com/api/webhooks/..."
                  onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DISCORD)}
                  style={buildStyle(
                    false,
                    errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DISCORD]],
                  )}
                  value={discord}
                />
              </div>
              <div className="col col--end col--no-gutter-right">
                <button
                  type="button"
                  className="settings__input-group--button"
                  tabIndex={0}
                  onKeyPress={onKeyPress}
                  onClick={() => {
                    onTestDiscord(discord);
                  }}
                >
                  Test
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row-gutter">
          <div className="col">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="settings__label">Slack URL</p>
                <input
                  className="settings__input-group--webhook__slack"
                  placeholder="https://hooks.slack.com/services/..."
                  onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_SLACK)}
                  style={buildStyle(
                    false,
                    errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SLACK]],
                  )}
                  value={slack}
                />
              </div>
              <div className="col col--end col--no-gutter-right">
                <button
                  type="button"
                  className="settings__input-group--button"
                  tabIndex={0}
                  onKeyPress={onKeyPress}
                  onClick={() => {
                    onTestSlack(slack);
                  }}
                >
                  Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

WebhooksPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onTestDiscord: PropTypes.func.isRequired,
  onTestSlack: PropTypes.func.isRequired,
  settings: sDefns.settings.isRequired,
  onKeyPress: PropTypes.func,
  errors: sDefns.settingsErrors.isRequired,
};

WebhooksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  settings: state.settings,
  errors: state.settings.errors,
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
  onTestDiscord: hook => {
    dispatch(settingsActions.test(hook, 'discord'));
  },
  onTestSlack: hook => {
    dispatch(settingsActions.test(hook, 'slack'));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WebhooksPrimitive);
