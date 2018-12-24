import React from 'react';

// components
import ViewLog from './viewLog';
import AWSCredentials from './awsCredentials';
import CreateProxies from './createProxies';
import CreateServer from './createServer';

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
                <p className="body-text section-header server-credentials__section-header">Login</p>
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <AWSCredentials />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col col--start">
        <div className="row row--start">
          <div className="col">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header proxy-options__section-header">Proxies</p>
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <CreateProxies />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col col--start">
        <div className="row row--start">
          <div className="col">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header proxy-options__section-header">Connect</p>
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <CreateServer />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="row row--start">
      <div className="col col--start">
        <div className="row row--start">
          <p className="body-text section-header server-table__section-header">Log</p>
        </div>
        <div className="row row--expand">
          <div className="col col--start server-table-container">
            <div className="row server-table__header">
              <div className="col col--no-gutter server-table__header__type">
                <p>Type</p>
              </div>
              <div className="col server-table__header__size">
                <p>Size</p>
              </div>
              <div className="col server-table__header__location">
                <p>Location</p>
              </div>
              <div className="col server-table__header__charges">
                <p>Charges</p>
              </div>
              <div className="col server-table__header__status">
                <p>Status</p>
              </div>
              <div className="col server-table__header__actions">
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
                <ViewLog />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Server;
