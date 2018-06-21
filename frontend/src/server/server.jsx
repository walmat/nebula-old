import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { SERVER_FIELDS, serverActions } from '../state/actions';

import '../app.css';
import './server.css';

import DDD from '../_assets/dropdown-down.svg';
// import DDU from '../_assets/dropdown-up.svg';

class Server extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.buildServerTypeChoices = this.buildServerTypeChoices.bind(this);
    this.buildServerSizeChoices = this.buildServerSizeChoices.bind(this);
    this.buildServerLocationChoices = this.buildServerLocationChoices.bind(this);
    this.loginAWS = this.loginAWS.bind(this);
    this.destroyProxies = this.destroyProxies.bind(this);
    this.generateProxies = this.generateProxies.bind(this);
    this.destroyServer = this.destroyProxies.bind(this);
    this.createServer = this.createServer.bind(this);
    this.createCredentialsChangeHandler = this.createCredentialsChangeHandler.bind(this);
    this.changeServerTypeChoice = this.changeServerTypeChoice.bind(this);
    this.changeServerSizeChoice = this.changeServerSizeChoice.bind(this);
    this.changeServerLocationChoice = this.changeServerLocationChoice.bind(this);
  }

  buildServerTypeChoices() {
    const { types } = this.props.serverListOptions;
    return types && types.map(type =>
      (<option key={type.id} value={type.id}>{type.label}</option>));
  }

  buildServerSizeChoices() {
    const { sizes } = this.props.serverListOptions;
    return sizes && sizes.map(size =>
      (<option key={size.id} value={size.id}>{size.label}</option>));
  }

  buildServerLocationChoices() {
    const { locations } = this.props.serverListOptions;
    return locations && locations.map(location =>
      (<option key={location.id} value={location.id}>{location.label}</option>));
  }

  changeServerTypeChoice(event) {
    const { types } = this.props.serverListOptions;
    const type = types.find(t => `${t.id}` === event.target.value);
    this.props.onServerTypeChoiceChange(type);
  }

  changeServerSizeChoice(event) {
    const { sizes } = this.props.serverListOptions;
    const size = sizes.find(s => `${s.id}` === event.target.value);
    this.props.onServerSizeChoiceChange(size);
  }

  changeServerLocationChoice(event) {
    const { locations } = this.props.serverListOptions;
    const location = locations.find(l => `${l.id}` === event.target.value);
    this.props.onServerLocationChoiceChange(location);
  }

  loginAWS(user, pass) {
    console.log(this.props);
    console.log(user, pass);
  }

  destroyProxies() {
    console.log(this.props);
  }

  generateProxies(number) {
    console.log(this.props, number);
  }

  destroyServer() {
    console.log(this.props);
    this.props.onDestroyServer(null);
  }

  createServer() {
    this.props.onSaveServerOptions(this.props.selectedServer);
  }

  createCredentialsChangeHandler(field) {
    return event => this.props.onCredentialsChange(field, event.target.value);
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="server-header">Server</h1>
        {/* LOGIN */}
        <p className="body-text" id="login-label">Login</p>
        <div id="login-box" />
        <p id="username-login-label">AWS Access Key</p>
        <input id="username-login" type="text" placeholder="Access Key" onChange={this.createCredentialsChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)} value={this.props.selectedServer.credentials.AWSAccessKey} required />
        <p id="password-login-label">AWS Secret Key</p>
        <input id="password-login" type="password" placeholder="xxxxxxx" onChange={this.createCredentialsChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)} value={this.props.selectedServer.credentials.AWSSecretKey} required />
        <button id="submit-aws-login" onClick={this.loginAWS} >Submit</button>

        {/* PROXIES */}
        <p className="body-text" id="proxies-label">Proxies</p>
        <div id="proxies-box" />
        <p id="number-label">Number</p>
        <input id="number" type="text" placeholder="00" onChange={this.props.onNumProxiesChange} value={this.props.selectedServer.proxy.numProxies} required />
        <p id="username-proxies-label">Username</p>
        <input id="username-proxies" type="text" placeholder="Desired Username" onChange={this.props.onProxyUsernameChange} value={this.props.selectedServer.proxy.username} required />
        <p id="password-proxies-label">Password</p>
        <input id="password-proxies" type="password" placeholder="Desired Password" onChange={this.props.onProxyPasswordChange} value={this.props.selectedServer.proxy.password} required />
        <button id="destroy-proxies" onClick={this.destroyProxies} >Destroy All</button>
        <button id="generate-proxies" onClick={this.generateProxies} >Generate</button>

        {/* CONNECT */}
        <p className="body-text" id="server-label">Connect</p>
        <div id="server-box" />
        <p id="type-server-label">Type</p>
        <select id="type-server" onChange={this.changeServerTypeChoice} value={this.props.serverName} required>
          <option value="" hidden>Choose Server</option>
          {this.buildServerTypeChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="type-server-button" />
        <p id="size-server-label">Size</p>
        <select id="size-server" onChange={this.changeServerSizeChoice} value={this.props.serverSize} disabled={!this.props.serverName} required>
          <option value="" hidden>Choose Size</option>
          {this.buildServerSizeChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="size-server-button" />
        <p id="location-server-label">Location</p>
        <select id="location-server" onChange={this.changeServerLocationChoice} value={this.props.serverLocation} disabled={!this.props.serverSize} required>
          <option value="" hidden>Choose Location</option>
          {this.buildServerLocationChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="location-server-button" />
        <button id="destroy-server" onClick={this.destroyServer}>Destroy</button>
        <button id="create-server" onClick={this.createServer}>Create</button>
      </div>
    );
  }
}

Server.propTypes = {
  selectedServer: PropTypes.objectOf(PropTypes.any).isRequired,
  serverListOptions: PropTypes.shape({
    types: PropTypes.arrayOf(PropTypes.any).isRequired,
    sizes: PropTypes.arrayOf(PropTypes.any).isRequired,
    locations: PropTypes.arrayOf(PropTypes.any).isRequired,
  }).isRequired,
  serverName: PropTypes.string.isRequired,
  serverSize: PropTypes.string.isRequired,
  serverLocation: PropTypes.string.isRequired,
  onCredentialsChange: PropTypes.func.isRequired,
  onServerTypeChoiceChange: PropTypes.func.isRequired,
  onServerSizeChoiceChange: PropTypes.func.isRequired,
  onServerLocationChoiceChange: PropTypes.func.isRequired,
  onSaveServerOptions: PropTypes.func.isRequired,
  onDestroyServer: PropTypes.func.isRequired,
  onNumProxiesChange: PropTypes.func.isRequired,
  onProxyUsernameChange: PropTypes.func.isRequired,
  onProxyPasswordChange: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  selectedServer: state.selectedServer,
  serverName: state.selectedServer.server.type.label || '',
  serverSize: state.selectedServer.server.size.label || '',
  serverLocation: state.selectedServer.server.location.label || '',
  serverListOptions: state.serverListOptions,
});

const mapDispatchToProps = dispatch => ({
  onCredentialsChange: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onServerTypeChoiceChange: (type) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_TYPE, type));
  },
  onServerSizeChoiceChange: (size) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_SIZE, size));
  },
  onServerLocationChoiceChange: (location) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_LOCATION, location));
  },
  onSaveServerOptions: (newServer) => {
    dispatch(serverActions.add(newServer));
  },
  onDestroyServer: (server) => {
    dispatch(serverActions.remove(server));
  },
  onNumProxiesChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_PROXY_NUMBER, event.target.value));
  },
  onProxyUsernameChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_PROXY_USERNAME, event.target.value));
  },
  onProxyPasswordChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_PROXY_PASSWORD, event.target.value));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Server);
