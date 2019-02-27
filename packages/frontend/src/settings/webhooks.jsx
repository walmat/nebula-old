import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import sDefns from '../utils/definitions/settingsDefinitions';

export class WebhooksPrimitive extends Component {
  static renderWebhookButton({ onClick, onKeyPress }) {
    return (
      <div className="col col--end col--no-gutter-right">
        <button
          type="button"
          className="settings__input-group--button"
          onKeyPress={onKeyPress}
          tabIndex={0}
          onClick={onClick}
        >
          Test
        </button>
      </div>
    );
  }

  createOnChangeHandler(field) {
    const { onSettingsChange } = this.props;
    return event => {
      onSettingsChange({
        field,
        value: event.target.value,
      });
    };
  }

  renderWebhookCol(label, className, placeholder, field, value, button) {
    const { errors } = this.props;
    return (
      <div className="col">
        <div className="row row--gutter">
          <div className="col col--no-gutter">
            <p className="settings__label">{label}</p>
            <input
              className={`settings__input-group--webhook__${className}`}
              placeholder={placeholder}
              onChange={this.createOnChangeHandler(field)}
              style={buildStyle(false, errors[mapSettingsFieldToKey[field]])}
              value={value}
            />
          </div>
          {WebhooksPrimitive.renderWebhookButton(button)}
        </div>
      </div>
    );
  }

  render() {
    const { settings, onTestDiscord, onTestSlack, onKeyPress } = this.props;
    const { discord, slack } = settings;
    return (
      <div>
        <div className="row row--start row-gutter">
          {this.renderWebhookCol(
            'Discord URL',
            'discord',
            'https://discordapp.com/api/webhooks/...',
            SETTINGS_FIELDS.EDIT_DISCORD,
            discord,
            {
              onClick: () => onTestDiscord(discord),
              onKeyPress,
            },
          )}
        </div>
        <div className="row row--start row-gutter">
          {this.renderWebhookCol(
            'Slack URL',
            'slack',
            'https://hooks.slack.com/services/...',
            SETTINGS_FIELDS.EDIT_SLACK,
            slack,
            {
              onClick: () => onTestSlack(slack),
              onKeyPress,
            },
          )}
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
