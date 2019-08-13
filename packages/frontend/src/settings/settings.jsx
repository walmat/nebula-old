import React from 'react';
import ProxyList from './proxyList';
import Webhooks from './webhooks';
import Defaults from './defaults';
import ShippingManager from './shippingManager';
import StateFunctions from './stateFunctions';

import '../app.css';
import './settings.css';

export default () => (
  <div className="container settings">
    <div className="row">
      <div className="col col--start">
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header settings__title">Settings</h1>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <ProxyList />
          </div>
          <div className="col col--start settings__extras">
            <Webhooks />
            <Defaults />
            <ShippingManager />
            <StateFunctions />
          </div>
        </div>
      </div>
    </div>
  </div>
);