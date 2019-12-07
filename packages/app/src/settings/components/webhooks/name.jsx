import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentWebhook } from '../../state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';

const WebhookName = ({ name, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-right">
    <p className="settings--webhook-manager__input-group--label">Webhook Name</p>
    <input
      className="settings--webhook-manager__input-group--name"
      placeholder="Webhook 1"
      onChange={e => onChange({ field: SETTINGS_FIELDS.EDIT_WEBHOOK_NAME, value: e.target.value })}
      value={name}
      data-private
    />
  </div>
);

WebhookName.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  name: makeCurrentWebhook(state).name,
});

export const mapDispatchToProps = dispatch => ({
  onChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WebhookName);
