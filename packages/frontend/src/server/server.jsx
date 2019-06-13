import React from 'react';

// components
import ProxyLog from './proxyLog';
import Credentials from './credentials';
import CreateProxies from './createProxies';

import '../app.css';
import './server.css';

const Server = () => (
  <div className="container server">
    <div className="row">
      <div className="col col--start">
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header server__title">Server</h1>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header server-credentials__section-header">
                  Credentials
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <Credentials />
              </div>
            </div>
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header proxy-options__section-header">Proxies</p>
                <CreateProxies />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col col--gutter col--expand server-log">
        <div className="row row--gutter row--start">
          <div className="col col--expand col--start">
            <div className="row row--start">
              <p className="body-text section-header server-table__section-header">Log</p>
            </div>
            <div className="row row--expand">
              <div className="col col--start server-table-container">
                <div className="row server-table__header">
                  <div className="col col--no-gutter server-table__header--location">
                    <p>Location</p>
                  </div>
                  <div className="col server-table__header--status">
                    <p>Status</p>
                  </div>
                  <div className="col server-table__header--charges">
                    <p>Charges</p>
                  </div>
                  <div className="col server-table__header--actions">
                    <p>Actions</p>
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col col--expand">
                    <hr className="view-line" />
                  </div>
                </div>
                <div className="row row--expand row--start">
                  <div className="col server-table__wrapper">
                    <ProxyLog />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Server;
