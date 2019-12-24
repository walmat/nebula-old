import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Select from 'react-select';

import { buildStyle } from '../../../styles';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../styles/components/select';

import { settingsActions } from '../../../store/actions';
import { buildWebhookOptions } from '../../../constants';

import { makeTheme } from '../../../app/state/selectors';
import { makeWebhooks, makeCurrentWebhook } from '../../state/selectors';

const onChange = (e, webhooks, onSelect) => {
  const id = e.value;
  const currentWebhook = webhooks.find(w => w.id === id);

  onSelect(currentWebhook);
};

const SelectWebhook = ({ theme, webhook, webhooks, onSelect }) => {
  let webhookValue = null;
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
          <p className="settings--shipping-manager__input-group--label">Webhook</p>
          <Select
            required
            placeholder="Webhooks"
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
            className="settings--webhook-manager__input-group--webhook"
            classNamePrefix="select"
            styles={colourStyles(theme, buildStyle(false, null))}
            onChange={e => onChange(e, webhooks, onSelect)}
            value={webhookValue}
            options={buildWebhookOptions(webhooks)}
            data-private
          />
        </div>
      </div>
    </div>
  );
};

SelectWebhook.propTypes = {
  theme: PropTypes.string.isRequired,
  webhooks: PropTypes.arrayOf(PropTypes.any).isRequired,
  webhook: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  webhooks: makeWebhooks(state),
  webhook: makeCurrentWebhook(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: webhook => {
    dispatch(settingsActions.selectWebhook(webhook));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SelectWebhook);
