import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentWebhook } from '../../state/selectors';
import { settingsActions } from '../../../store/actions';

import { HookTypes } from '../../../constants';

const Button = ({ type, label, onClick }) => (
  <button
    type="button"
    className={`settings--webhook-manager__input-group--${type}`}
    tabIndex={0}
    onKeyPress={() => {}}
    onClick={onClick}
  >
    {label}
  </button>
);

Button.propTypes = {
  type: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const onTest = ({ url }) => {
  if (
    url &&
    /https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/.test(url)
  ) {
    return window.Bridge.sendWebhookTestMessage(url, HookTypes.slack);
  }

  if (url && /https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*/.test(url)) {
    return window.Bridge.sendWebhookTestMessage(url, HookTypes.discord);
  }
  return null;
};

const WebhookButtons = ({ webhook, onCreate, onRemove }) => (
  <>
    <div className="col col--end">
      <Button
        type="create"
        label={webhook.id ? 'Update' : 'Create'}
        onClick={() => onCreate(webhook)}
      />
    </div>
    <div className="col col--end col--no-gutter">
      <Button type="remove" label="Remove" onClick={() => onRemove(webhook)} />
    </div>
    <div className="col col--end col--gutter-left">
      <Button type="test" label="Test" onClick={() => onTest(webhook)} />
    </div>
  </>
);

WebhookButtons.propTypes = {
  webhook: PropTypes.objectOf(PropTypes.any).isRequired,
  onCreate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  webhook: makeCurrentWebhook(state),
});

const mapDispatchToProps = dispatch => ({
  onCreate: webhook => {
    dispatch(settingsActions.createWebhook(webhook));
  },
  onRemove: webhook => {
    dispatch(settingsActions.deleteWebhook(webhook));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(WebhookButtons);
