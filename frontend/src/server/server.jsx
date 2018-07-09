import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { SERVER_FIELDS, serverActions } from '../state/actions';

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
    this.createCredentialsChangeHandler = this.createCredentialsChangeHandler.bind(this);
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

  renderServerTypeComponent() {
    return Server.renderServerOptionComponent(
      'type',
      'Type',
      'Choose Server',
      this.props.serverType.id,
      false,
      Server.changeServerChoice(
        this.props.serverListOptions.types,
        this.props.onServerTypeChoiceChange,
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
        this.props.onServerSizeChoiceChange,
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
        this.props.onServerLocationChoiceChange,
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
        <input id="access-key" type="text" placeholder="Access Key" onChange={this.createCredentialsChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)} value={this.props.selectedServer.credentials.AWSAccessKey} required />
        <p id="secret-key-label">AWS Secret Key</p>
        <input id="secret-key" type="password" placeholder="xxxxxxx" onChange={this.createCredentialsChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)} value={this.props.selectedServer.credentials.AWSSecretKey} required />
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
  selectedServer: PropTypes.objectOf(PropTypes.any).isRequired,
  serverListOptions: PropTypes.shape({
    types: PropTypes.arrayOf(PropTypes.any).isRequired,
    sizes: PropTypes.arrayOf(PropTypes.any).isRequired,
    locations: PropTypes.arrayOf(PropTypes.any).isRequired,
  }).isRequired,
  serverType: PropTypes.objectOf(PropTypes.any).isRequired,
  serverSize: PropTypes.objectOf(PropTypes.any).isRequired,
  serverLocation: PropTypes.objectOf(PropTypes.any).isRequired,
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
  serverType: state.selectedServer.server.type,
  serverSize: state.selectedServer.server.size,
  serverLocation: state.selectedServer.server.location,
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
