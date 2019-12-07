import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentWebhook } from '../../state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';

const WebhookUrl = ({ url, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-right" style={{ flexGrow: 5 }}>
    <p className="settings--webhook-manager__input-group--label">Webhook URL</p>
    <input
      className="settings--webhook-manager__input-group--url"
      placeholder="https://discordapp.com/api/webhooks/..."
      onChange={e => onChange({ field: SETTINGS_FIELDS.EDIT_WEBHOOK_URL, value: e.target.value })}
      value={url}
      data-private
    />
  </div>
);

WebhookUrl.propTypes = {
  url: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  url: makeCurrentWebhook(state).url,
});

export const mapDispatchToProps = dispatch => ({
  onChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WebhookUrl);
