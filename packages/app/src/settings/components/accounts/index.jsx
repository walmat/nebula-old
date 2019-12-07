import React from 'react';

import AccountFields from './fields';
import SelectAccount from './select';
import ActionButtons from './buttons';

const AccountManagerPrimitive = () => (
  <div className="row row--gutter" style={{ flexGrow: 0 }}>
    <div className="col col--start col--expand col--no-gutter">
      <div className="row row--start row--gutter">
        <div className="col col--no-gutter-left">
          <p className="body-text section-header settings--account-manager__section-header">
            Account Manager
          </p>
        </div>
      </div>
      <div className="row row--start row--gutter-left">
        <div className="col col--start col--expand col--no-gutter">
          <div className="row row--start row--expand row--no-gutter-left">
            <div className="col col--start col--expand settings--account-manager__input-group">
              <AccountFields />
              <div className="row row--gutter" style={{ marginBottom: '15px' }}>
                <SelectAccount />
                <ActionButtons />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AccountManagerPrimitive;
