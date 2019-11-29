import React from 'react';
import ProxyList from './components/proxyList';
import Webhooks from './components/webhooks';
// import Defaults from './components/defaults';
import ShippingManager from './components/shippingManager';
import AccountManager from './components/accountManager';
import StateFunctions from './components/stateFunctions';

import '../styles/index.scss';
import './styles/index.scss';

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
            <ShippingManager />
            <AccountManager />
            <StateFunctions />
          </div>
        </div>
      </div>
    </div>
  </div>
);
