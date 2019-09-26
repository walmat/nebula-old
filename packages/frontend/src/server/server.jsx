import React from 'react';

import ProxyLog from './proxyLog';
import Credentials from './credentials';
import CreateProxies from './createProxies';

import '../app.css';
import './server.css';

const Server = () => (
  <div className="container server">
    <div className="row" style={{ width: '100%' }}>
      <div className="col col--start col--expand" style={{ flexGrow: 0 }}>
        <div className="row row--start">
          <div className="col col--start col--expand col--no-gutter-left">
            <h1 className="text-header server__title">Server</h1>
          </div>
        </div>
        <div className="row row--start row--expand">
          <div className="col col--start col--expand">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header server-credentials__section-header">
                  Credentials
                </p>
              </div>
            </div>
            <div className="row row--start row--expand" style={{ flexGrow: 0 }}>
              <div className="col col--start col--expand col--no-gutter-left">
                <Credentials />
              </div>
            </div>
            <div className="row row--start row--expand" style={{ flexGrow: 0 }}>
              <div className="col col--start col--expand col--no-gutter-left">
                <p className="body-text section-header proxy-options__section-header">Proxies</p>
                <CreateProxies />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProxyLog />
    </div>
  </div>
);

export default Server;
