import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import { SERVER_FIELDS, serverActions } from '../state/actions';
import defns from '../utils/definitions/serverDefinitions';

import '../app.css';
import './server.css';

import DDD from '../_assets/dropdown-down.svg';
// import DDU from '../_assets/dropdown-up.svg';

class Server extends Component {
  static buildServerTypeChoices(options, onFilter) {
    return () => {
      if (!options) {
        return options;
      }
      const filtered = onFilter ? options.filter(onFilter) : options;
      return filtered.map(o =>
        (<option key={o.id} value={o.id}>{o.label}</option>));
    };
  }

  static changeServerChoice(options, onChange) {
    return (event) => {
      const change = options.find(o => `${o.id}` === event.target.value);
      onChange(change);
    };
  }

  constructor(props) {
    super(props);
    this.loginAWS = this.loginAWS.bind(this);
    this.destroyProxies = this.destroyProxies.bind(this);
    this.generateProxies = this.generateProxies.bind(this);
    this.destroyServer = this.destroyProxies.bind(this);
    this.createServer = this.createServer.bind(this);
    this.createServerInfoChangeHandler = this.createServerInfoChangeHandler.bind(this);
  }

  loginAWS(e) {
    e.preventDefault();
    console.log(this.props);
  }

  destroyProxies(e) {
    e.preventDefault();
    console.log(this.props);
  }

  generateProxies(e) {
    e.preventDefault();
    console.log(this.props);
  }

  destroyServer(e) {
    e.preventDefault();
    console.log(this.props);
    this.props.onDestroyServer(null);
  }

  createServer(e) {
    e.preventDefault();
    this.props.onSaveServerOptions(this.props.serverInfo);
  }

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
  }

  renderServerTypeComponent() {
    return Server.renderServerOptionComponent(
      'type',
      'Type',
      'Choose Server',
      this.props.serverType.id,
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
      this.props.serverSize.id,
      !this.props.serverType.id,
      Server.changeServerChoice(
        this.props.serverListOptions.sizes,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_SIZE),
      ),
      Server.buildServerTypeChoices(
        this.props.serverListOptions.sizes,
        (s => (this.props.serverType.id
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
      this.props.serverLocation.id,
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
        <select id={`${type}-server`} onChange={onChange} value={value} disabled={disabled} required>
          <option value="" hidden>{defaultOption}</option>
          {optionGenerator()}
        </select>
        <img src={DDD} alt="dropdown button" id={`${type}-server-button`} />
      </div>
    );
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="server-header">Server</h1>
        {/* LOGIN */}
        <p className="body-text" id="login-label">Login</p>
        <div id="login-box" />
        <p id="access-key-label">AWS Access Key</p>
        <input id="access-key" type="text" placeholder="Access Key" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)} value={this.props.serverInfo.credentials.AWSAccessKey} required />
        <p id="secret-key-label">AWS Secret Key</p>
        <input id="secret-key" type="password" placeholder="xxxxxxx" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)} value={this.props.serverInfo.credentials.AWSSecretKey} required />
        <button id="submit-aws-login" onClick={this.loginAWS} >Submit</button>

        {/* PROXIES */}
        <p className="body-text" id="proxies-label">Proxies</p>
        <div id="proxies-box" />
        <p id="number-label">Number</p>
        <input id="number" type="text" placeholder="00" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)} value={this.props.serverInfo.proxyOptions.numProxies} required />
        <p id="username-proxies-label">Username</p>
        <input id="username-proxies" type="text" placeholder="Desired Username" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)} value={this.props.serverInfo.proxyOptions.username} required />
        <p id="password-proxies-label">Password</p>
        <input id="password-proxies" type="password" placeholder="Desired Password" onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)} value={this.props.serverInfo.proxyOptions.password} required />
        <button id="destroy-proxies" onClick={this.destroyProxies} >Destroy All</button>
        <button id="generate-proxies" onClick={this.generateProxies} >Generate</button>

        {/* CONNECT */}
        <p className="body-text" id="server-label">Connect</p>
        <div id="server-box" />
        {this.renderServerTypeComponent()}
        {this.renderServerSizeComponent()}
        {this.renderServerLocationComponent()}
        <img src={DDD} alt="dropdown button" id="location-server-button" />
        <button id="destroy-server" onClick={this.destroyServer}>Destroy</button>
        <button id="create-server" onClick={this.createServer}>Create</button>
      </div>
    );
  }
}

Server.propTypes = {
  serverInfo: defns.serverInfo.isRequired,
  serverListOptions: defns.serverListOptions.isRequired,
  serverType: defns.serverType.isRequired,
  serverSize: defns.serverSize.isRequired,
  serverLocation: defns.serverLocation.isRequired,
  onSaveServerOptions: PropTypes.func.isRequired,
  onDestroyServer: PropTypes.func.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  serverInfo: state.serverInfo,
  serverType: state.serverInfo.serverOptions.type,
  serverSize: state.serverInfo.serverOptions.size,
  serverLocation: state.serverInfo.serverOptions.location,
  serverListOptions: state.serverListOptions,
});

const mapDispatchToProps = dispatch => ({
  onSaveServerOptions: (newServer) => {
    console.log('TODO: onSaveServerOptions!');
  },
  onDestroyServer: (server) => {
    console.log('TODO: onDestroyServer!');
  },
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Server));
