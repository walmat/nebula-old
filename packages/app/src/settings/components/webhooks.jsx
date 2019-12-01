import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../../styles';
import withReducer from '../../store/reducers/withReducer';
import { webhookReducer } from '../state/reducers';
import { settingsActions, SETTINGS_FIELDS } from '../../store/actions';

export class WebhooksPrimitive extends PureComponent {
  static renderWebhookButton(type, onClick, onKeyPress) {
    return (
      <div className="col col--end col--expand col--no-gutter-right">
        <button
          type="button"
          className={`settings__input-group--button__${type}`}
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
    const { onTestDiscord, onTestSlack, onKeyPress } = this.props;
    const { placeholder, label, type } = this.inputs[field];
    const onClick = () =>
      field === SETTINGS_FIELDS.EDIT_DISCORD ? onTestDiscord(value) : onTestSlack(value);
    return (
      <div className="col col--expand col--no-gutter-right">
        <div className="row row--gutter">
          <div className="col col--start col--expand col--no-gutter">
            <p className="settings__label">{label}</p>
            <input
              className={`settings__input-group--webhook__${type}`}
              placeholder={placeholder}
              onChange={this.createOnChangeHandler(field)}
              style={buildStyle(false, null)}
              value={value}
              data-private
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
      <>
        <div className="row row--no-gutter-right">
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_DISCORD, discord)}
        </div>
        <div className="row row--no-gutter-right">
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_SLACK, slack)}
        </div>
      </>
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
};

WebhooksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  discord: state.Settings.discord,
  slack: state.Settings.slack,
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
