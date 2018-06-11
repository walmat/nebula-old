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
  }

  buildServerChoices() {
    const { servers } = this.props;
    return servers && servers.map(server =>
      (<option key={server.type}>{server.serverName}</option>));
  }

  buildServerSizeChoices() {
    const { servers } = this.props;
    return servers && servers.map(server =>
      (<option key={server.type}>{server.serverSize}</option>));
  }

  buildServerLocationChoices() {
    const { servers } = this.props;
    return servers && servers.map(server =>
      (<option key={server.type}>{server.serverLocation}</option>));
  }

  // loginAWS = (user, pass) => {
  // }

  // destroyProxies = () => {
  // }

  // generateProxies = (number) => {
  // }

  // destroyServer = () => {
  // }

  createServer() {
    this.props.onSaveServerOptions(this.props.selectedServer);
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="server-header">Server</h1>
        {/* LOGIN */}
        <p className="body-text" id="login-label">Login</p>
        <div id="login-box" />
        <p id="username-login-label">Username</p>
        <input id="username-login" type="text" placeholder="John Smith" required />
        <p id="password-login-label">Password</p>
        <input id="password-login" type="password" placeholder="xxxxxxx" required />
        <button id="submit-aws-login" onClick={this.loginAWS} >Submit</button>

        {/* PROXIES */}
        <p className="body-text" id="proxies-label">Proxies</p>
        <div id="proxies-box" />
        <p id="number-label">Number</p>
        <input id="number" type="text" placeholder="00" onChange={this.props.onNumProxiesChange} required />
        <p id="username-proxies-label">Username</p>
        <input id="username-proxies" type="text" placeholder="Desired Username" onChange={this.props.onProxyUsernameChange} required />
        <p id="password-proxies-label">Password</p>
        <input id="password-proxies" type="password" placeholder="Desired Password" onChange={this.props.onProxyPasswordChange} required />
        <button id="destroy-proxies" onClick={this.destroyProxies} >Destroy All</button>
        <button id="generate-proxies" onClick={this.generateProxies} >Generate</button>

        {/* CONNECT */}
        <p className="body-text" id="server-label">Connect</p>
        <div id="server-box" />
        <p id="type-server-label">Type</p>
        <select id="type-server" onChange={this.props.onServerChoiceChange} value={this.props.selectedServer.serverName || ''} required>
          <option value="" hidden>Choose Server</option>
          {this.buildServerChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="type-server-button" />
        <p id="size-server-label">Size</p>
        <select id="size-server" onChange={this.props.onServerSizeChoiceChange} value={this.props.selectedServer.serverSize || ''} disabled={!!this.props.selectedServer.serverName} required>
          <option value="" hidden>Choose Size</option>
          {this.buildServerSizeChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="size-server-button" />
        <p id="location-server-label">Location</p>
        <select id="location-server" onChange={this.props.onServerLocationChoiceChange} value={this.props.selectedServer.serverLocation || ''} disabled={!!this.props.selectedServer.serverSize} required>
          <option value="" hidden>Choose Location</option>
          {this.buildServerLocationChoices()}
        </select>
        <img src={DDD} alt="dropdown button" id="location-server-button" />
        <button id="destroy-server" onClick={this.destroyServer} >Destroy</button>
        <button id="create-server" onClick={this.createServer} >Create</button>
      </div>
    );
  }
}

Server.propTypes = {
  selectedServer: PropTypes.objectOf(PropTypes.any).isRequired,
  serverName: PropTypes.string.isRequired,
  serverSize: PropTypes.string.isRequired,
  serverLocation: PropTypes.string.isRequired,
  servers: PropTypes.arrayOf(PropTypes.any).isRequired,
  onServerChoiceChange: PropTypes.func.isRequired,
  onServerSizeChoiceChange: PropTypes.func.isRequired,
  onServerLocationChoiceChange: PropTypes.func.isRequired,
  onSaveServerOptions: PropTypes.func.isRequired,
  // onDestroyServer: PropTypes.func.isRequired,
  onNumProxiesChange: PropTypes.func.isRequired,
  onProxyUsernameChange: PropTypes.func.isRequired,
  onProxyPasswordChange: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  selectedServer: state.selectedServer,
  serverName: state.serverName,
  serverSize: state.serverSize,
  serverLocation: state.serverLocation,
});

const mapDispatchToProps = dispatch => ({
  onServerChoiceChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_CHOICE, event.target.value));
  },
  onServerSizeChoiceChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_SIZE, event.target.value));
  },
  onServerLocationChoiceChange: (event) => {
    dispatch(serverActions.edit(null, SERVER_FIELDS.EDIT_SERVER_LOCATION, event.target.value));
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
