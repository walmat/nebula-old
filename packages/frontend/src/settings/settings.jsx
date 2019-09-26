import React from 'react';
import ProxyList from './proxyList';
import Webhooks from './webhooks';
// import Defaults from './defaults';
import ShippingManager from './shippingManager';
import AccountManager from './accountManager';
import StateFunctions from './stateFunctions';

import '../app.css';
import './settings.css';

export default () => (
  <div className="container settings">
    <div className="row row--start row--expand row--no-gutter">
      <div className="col col--start col--expand">
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header settings__title">Settings</h1>
          </div>
        </div>
        <div className="row row--start row--expand" style={{ width: '100%' }}>
          <div className="col col--start col--expand col--no-gutter" style={{ flexGrow: 5 }}>
            <ProxyList />
          </div>
          <div className="col col--start settings__extras" style={{ flexGrow: 0 }}>
            <Webhooks />
            {/* <Defaults /> */}
            <ShippingManager />
            <AccountManager />
            <StateFunctions />
          </div>
        </div>
      </div>
    </div>
  </div>
);
