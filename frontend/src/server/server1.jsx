import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import ViewLog from './viewLog1';
import AWSCredentials from './awsCredentials';
import { SERVER_FIELDS, serverActions } from '../state/actions';
import defns from '../utils/definitions/serverDefinitions';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';

import '../app.css';
import './server.css';


class Server extends Component {
  static buildServerTypeChoices(options, onFilter) {
    return () => {
      if (!options) {
        return options;
      }
      const filtered = onFilter ? options.filter(onFilter) : options;
      return filtered.map(o => ({ value: o.id, label: o.label }));
    };
  }

  static changeServerChoice(options, onChange) {
    return (event) => {
      const change = options.find(o => o.id === event.value);
      onChange(change);
    };
  }

  constructor(props) {
    super(props);
    this.destroyProxies = this.destroyProxies.bind(this);
    this.generateProxies = this.generateProxies.bind(this);
    this.createServer = this.createServer.bind(this);
    this.createServerInfoChangeHandler = this.createServerInfoChangeHandler.bind(this);
  }

  destroyProxies(e) {
    e.preventDefault();
    this.props.onDestroyProxies();
  }

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
  }

  generateProxies(e) {
    e.preventDefault();
    this.props.onGenerateProxies(this.props.serverInfo.proxyOptions);
  }

  createServer(e) {
    e.preventDefault();
    this.props.onCreateServer(
      this.props.serverInfo.serverOptions,
      this.props.serverInfo.credentials,
    );
  }

  renderServerTypeComponent() {
    return Server.renderServerOptionComponent(
      'type',
      'Type',
      'Choose Server',
      this.props.serverType,
      false,
      Server.changeServerChoice(
        this.props.serverListOptions.types,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_TYPE),
      ),
      Server.buildServerTypeChoices(this.props.serverListOptions.types),
    );
  }

  renderServerSizeComponent() {
    return Server.renderServerOptionComponent(
      'size',
      'Size',
      'Choose Size',
      this.props.serverSize,
      !this.props.serverType,
      Server.changeServerChoice(
        this.props.serverListOptions.sizes,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_SIZE),
      ),
      Server.buildServerTypeChoices(
        this.props.serverListOptions.sizes,
        (s => (this.props.serverType
          ? s.types.some(t => t === this.props.serverType.id)
          : true)),
      ),
    );
  }

  renderServerLocationComponent() {
    return Server.renderServerOptionComponent(
      'location',
      'Location',
      'Choose Location',
      this.props.serverLocation,
      false,
      Server.changeServerChoice(
        this.props.serverListOptions.locations,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_LOCATION),
      ),
      Server.buildServerTypeChoices(this.props.serverListOptions.locations),
    );
  }

  static renderServerOptionComponent(
    type, label, defaultOption, value,
    disabled, onChange, optionGenerator,
  ) {
    return (
      <div>
        <p id={`${type}-server-label`}>{label}</p>
        <Select
          required
          placeholder={defaultOption}
          components={{ DropdownIndicator }}
          id={`${type}-server`}
          classNamePrefix="select"
          styles={colourStyles}
          onChange={onChange}
          isDisabled={disabled}
          value={value}
          options={optionGenerator()}
        />
      </div>
    );
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
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <AWSCredentials />
              </div>
            </div>
          </div>
        </div>
        {/* <p className="body-text" id="login-label">Login</p> */}


        {/* PROXIES */}
        <p className="body-text" id="proxies-label">Proxies</p>
        <div id="proxies-box" />
        <p id="number-label">Number</p>
        <input id="number" type="text" placeholder="00" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)} value={this.props.serverInfo.proxyOptions.numProxies} required />
        <p id="username-proxies-label">Username</p>
        <input id="username-proxies" type="text" placeholder="Desired Username" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)} value={this.props.serverInfo.proxyOptions.username} required />
        <p id="password-proxies-label">Password</p>
        <input id="password-proxies" type="password" placeholder="Desired Password" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)} value={this.props.serverInfo.proxyOptions.password} required />
        <button disabled={!loggedInAws} id="generate-proxies" title={!loggedInAws ? 'Login Required' : ''} style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }} onClick={this.generateProxies} >Generate</button>
        <button disabled={!loggedInAws} id="destroy-proxies" title={!loggedInAws ? 'Login Required' : ''} style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }} onClick={this.destroyProxies} >Destroy All</button>

        {/* CONNECT */}
        <p className="body-text" id="server-label">Connect</p>
        <div id="server-box" />
        {this.renderServerTypeComponent()}
        {this.renderServerSizeComponent()}
        {this.renderServerLocationComponent()}
        <button disabled={!loggedInAws} id="create-server" title={!loggedInAws ? 'Login Required' : ''} style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }} onClick={this.createServer}>Create</button>
        <button disabled={!loggedInAws} id="destroy-server" title={!loggedInAws ? 'Login Required' : ''} style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }} onClick={() => { this.props.onDestroyServers(this.props.servers, this.props.serverInfo.credentials); }} >Destroy All</button>

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
  serverType: defns.serverType,
  serverSize: defns.serverSize,
  serverLocation: defns.serverLocation,
  serverListOptions: defns.serverListOptions.isRequired,
  onCreateServer: PropTypes.func.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
  onDestroyProxies: PropTypes.func.isRequired,
  onDestroyServers: PropTypes.func.isRequired,
  onGenerateProxies: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  servers: state.servers,
  serverInfo: state.serverInfo,
  serverType: state.serverInfo.serverOptions.type || null,
  serverSize: state.serverInfo.serverOptions.size || null,
  serverLocation: state.serverInfo.serverOptions.location || null,
  serverListOptions: state.serverListOptions,
});

const mapDispatchToProps = dispatch => ({
  onCreateServer: (serverOptions, awsCredentials) => {
    dispatch(serverActions.create(serverOptions, awsCredentials));
  },
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onDestroyProxies: () => {
    dispatch(serverActions.destroyProxies());
  },
  onDestroyServers: (servers, awsCredentials) => {
    dispatch(serverActions.destroyAll(servers, awsCredentials));
  },
  onGenerateProxies: (options) => {
    dispatch(serverActions.generateProxies(options));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Server));
