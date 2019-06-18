import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import sDefns from '../utils/definitions/settingsDefinitions';

export class WebhooksPrimitive extends PureComponent {
  static renderWebhookButton(type, onClick, onKeyPress) {
    return (
      <div className="col col--end col--no-gutter-right">
        <button
          type="button"
          className={`settings__input-group--button-${type}`}
          onKeyPress={onKeyPress}
          tabIndex={0}
          onClick={onClick}
        >
          Test
        </button>
      </div>
    );
  }

  constructor(props) {
    super(props);
    this.inputs = {
      [SETTINGS_FIELDS.EDIT_DISCORD]: {
        placeholder: 'https://discordapp.com/api/webhooks/...',
        label: 'Discord URL',
        type: 'discord',
      },
      [SETTINGS_FIELDS.EDIT_SLACK]: {
        placeholder: 'https://hooks.slack.com/services/...',
        label: 'Slack URL',
        type: 'slack',
      },
    };
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

  renderWebhookInput(field, value) {
    const { errors, onTestDiscord, onTestSlack, onKeyPress } = this.props;
    const { placeholder, label, type } = this.inputs[field];
    const onClick = () =>
      field === SETTINGS_FIELDS.EDIT_DISCORD ? onTestDiscord(value) : onTestSlack(value);
    return (
      <div className="col">
        <div className="row row--gutter">
          <div className="col col--no-gutter">
            <p className="settings__label">{label}</p>
            <input
              className={`settings__input-group--webhook__${type}`}
              placeholder={placeholder}
              onChange={this.createOnChangeHandler(field)}
              style={buildStyle(false, errors[mapSettingsFieldToKey[field]])}
              value={value}
            />
          </div>
          {WebhooksPrimitive.renderWebhookButton(type, onClick, onKeyPress)}
        </div>
      </div>
    );
  }

  render() {
    const { discord, slack } = this.props;
    return (
      <div>
        <div className="row row--start row-gutter">
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_DISCORD, discord)}
        </div>
        <div className="row row--start row-gutter">
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_SLACK, slack)}
        </div>
      </div>
    );
  }
}

WebhooksPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onTestDiscord: PropTypes.func.isRequired,
  onTestSlack: PropTypes.func.isRequired,
  discord: PropTypes.string.isRequired,
  slack: PropTypes.string.isRequired,
  onKeyPress: PropTypes.func,
  errors: sDefns.settingsErrors.isRequired,
};

WebhooksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  discord: state.settings.discord,
  slack: state.settings.slack,
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
