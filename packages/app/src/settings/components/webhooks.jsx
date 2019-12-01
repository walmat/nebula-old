import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../../styles';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';

import { makeTheme } from '../../app/state/selectors';
import { makeCurrentWebhook, makeWebhooks } from '../state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../store/actions';

export class WebhooksPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.inputs = {
      [SETTINGS_FIELDS.EDIT_WEBHOOK_URL]: {
        placeholder: 'https://discordapp.com/api/webhooks/...',
        label: 'Webhook URL',
      },
      [SETTINGS_FIELDS.EDIT_WEBHOOK_NAME]: {
        placeholder: 'Webhook 1',
        label: 'Name',
      },
    };
  }

  createOnChangeHandler(field) {
    const { onSettingsChange, onSelectWebhook } = this.props;
    switch (field) {
      case SETTINGS_FIELDS.SELECT_WEBHOOK:
        return event => {
          console.log(event);
          onSelectWebhook(event.value);
        };
      default:
        return event => {
          onSettingsChange({
            field,
            value: event.target.value,
          });
        };
    }
  }

  buildWebhookOptions() {
    const { webhooks } = this.props;
    const opts = [];
    webhooks.forEach(hook => {
      opts.push({ value: hook.id, label: hook.name });
    });
    return opts;
  }

  renderWebhookInput(field, value) {
    const { placeholder, label } = this.inputs[field];
    return (
      <div className="col col--expand col--no-gutter-right">
        <div className="row row--gutter">
          <div className="col col--start col--expand col--no-gutter">
            <p className="settings__label">{label}</p>
            <input
              className="settings__input-group--webhook"
              placeholder={placeholder}
              onChange={this.createOnChangeHandler(field)}
              style={buildStyle(false, null)}
              value={value}
              data-private
            />
          </div>
        </div>
      </div>
    );
  }

  renderWebhooks() {
    const { webhook, theme } = this.props;

    let webhookValue;
    if (webhook && webhook.id) {
      webhookValue = {
        label: webhook.name,
        value: webhook.id,
      };
    }

    return (
      <div className="col col--expand col--no-gutter-right">
        <div className="row row--gutter">
          <div className="col col--start col--expand col--no-gutter">
            <Select
              required
              placeholder="Choose Webhook"
              components={{
                DropdownIndicator,
                IndicatorSeparator,
                Control,
                Option,
                Menu,
                MenuList,
              }}
              isMulti={false}
              isClearable={false}
              className="settings--webhook-manager__input-group--account"
              classNamePrefix="select"
              styles={colourStyles(theme, buildStyle(false, null))}
              onChange={this.createOnChangeHandler(SETTINGS_FIELDS.SELECT_WEBHOOK)}
              value={webhookValue}
              options={this.buildWebhookOptions()}
              data-private
            />
          </div>
        </div>
      </div>
    );
  }

  renderWebhookButton() {
    const {
      onKeyPress,
      webhook: { url },
    } = this.props;

    let onClick = () => {};
    if (
      url &&
      /https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*|https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/.test(
        url,
      )
    ) {
      onClick = () => window.Bridge.sendWebhookTestMessage(url);
    }

    return (
      <div className="col col--end col--expand col--no-gutter-right">
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

  render() {
    const { webhook } = this.props;
    return (
      <>
        <div className="row row--no-gutter-right">
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_WEBHOOK_URL, webhook.url)}
          {this.renderWebhookInput(SETTINGS_FIELDS.EDIT_WEBHOOK_NAME, webhook.name)}
        </div>
        <div className="row row--no-gutter-right">
          {this.renderWebhooks()}
          {this.renderWebhookButton()}
        </div>
      </>
    );
  }
}

WebhooksPrimitive.propTypes = {
  onSelectWebhook: PropTypes.func.isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  webhook: PropTypes.string.isRequired,
  webhooks: PropTypes.arrayOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
  onKeyPress: PropTypes.func,
};

WebhooksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  webhook: makeCurrentWebhook(state),
  webhooks: makeWebhooks(state),
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
  onSelectWebhook: opts => {
    dispatch(settingsActions.selectWebhook(...opts));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WebhooksPrimitive);
