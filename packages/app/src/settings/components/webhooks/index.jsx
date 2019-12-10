import React from 'react';

import WebhookUrl from './url';
import WebhookName from './name';
import SelectWebhook from './select';
import WebhookActions from './buttons';

const WebhooksPrimitive = () => (
  <div className="row row--start row--expand row--gutter" style={{ flexGrow: 0 }}>
    <div className="col col--start col--expand col--no-gutter">
      <div className="row row--start row--gutter">
        <div className="col col--no-gutter-left">
          <p className="body-text section-header settings--webhook-manager__section-header">
            Webhook Manager
          </p>
        </div>
      </div>
      <div className="row row--start row--gutter-left">
        <div className="col col--start col--expand col--no-gutter">
          <div className="row row--start row--expand row--no-gutter-left">
            <div className="col col--start col--expand settings--webhook-manager__input-group">
              <div className="row row--start row--expand row--gutter" style={{ margin: '15px 0' }}>
                <WebhookUrl />
                <WebhookName />
              </div>
              <div
                className="row row--start row--expand row--gutter"
                style={{ marginBottom: '15px' }}
              >
                <SelectWebhook />
                <WebhookActions />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default WebhooksPrimitive;
