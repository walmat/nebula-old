import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

// components
import ViewLog from './viewLog1';
import AWSCredentials from './awsCredentials';
import CreateProxies from './createProxies';
import CreateServer from './createServer';

import { serverActions } from '../state/actions';
import defns from '../utils/definitions/serverDefinitions';

import '../app.css';
import './server.css';


class Server extends Component {

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
  }

  render() {
    const loggedInAws = this.props.serverInfo.credentials.accessToken != null;
    return (
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
        {/* SERVER LOG */}
        <p className="body-text" id="server-log-label">Log</p>
        <div id="server-log-box" />
        <p className="server-log-header" id="server-type-header">Type</p>
        <p className="server-log-header" id="server-size-header">Size</p>
        <p className="server-log-header" id="server-location-header">Location</p>
        <p className="server-log-header" id="server-charges-header">Estimated Charges</p>
        <p className="server-log-header" id="server-status-header">Status</p>
        <p className="server-log-header" id="server-actions-header">Action</p>
        <hr id="server-log-line" />
        <div id="server-scroll-box">
          <ViewLog />
        </div>
      </div>
    );
  }
}

Server.propTypes = {
  servers: defns.serverList.isRequired,
  serverInfo: defns.serverInfo.isRequired,
};

const mapStateToProps = state => ({
  servers: state.servers,
  serverInfo: state.serverInfo,
});

const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Server));
