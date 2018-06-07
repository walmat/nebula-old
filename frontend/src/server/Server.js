import React, { Component } from 'react';
import {SERVER_FIELDS, serverActions} from "../state/Actions";
import {connect} from "react-redux";

import '../App.css';
import './Server.css';

import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';

class Server extends Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    buildServerChoices = () => {
        let servers = this.props.servers;
        return servers && servers.map((server) => {
            return <option key={server.type}>{server.serverName}</option>;
        });
    };

    buildServerSizeChoices = () => {
        let servers = this.props.servers;
        return servers && servers.map((server) => {
            return <option key={server.type}>{server.serverSize}</option>;
        });
    };

    buildServerLocationChoices = () => {
        let servers = this.props.servers;
        return servers && servers.map((server) => {
            return <option key={server.type}>{server.serverLocation}</option>;
        });
    };


    loginAWS = (user, pass) => {

    };

    destroyProxies = () => {

    };

    generateProxies = (number) => {

    };

    destroyServer = () => {

    };

    createServer = () => {

    };

    render() {
        return (
            <div className="container">
                <h1 className="text-header" id="server-header">Server</h1>
                {/*LOGIN*/}
                <p className="body-text" id="login-label">Login</p>
                <div id="login-box" />
                <p id="username-login-label">Username</p>
                <input id="username-login" type="text" placeholder="John Smith" required />
                <p id="password-login-label">Password</p>
                <input id="password-login" type="password" placeholder="xxxxxxx" required />
                <button id="submit-aws-login" onClick={this.loginAWS} >Submit</button>

                {/*PROXIES*/}
                <p className="body-text" id="proxies-label">Proxies</p>
                <div id="proxies-box" />
                <p id="number-label">Number</p>
                <input id="number" type="text" placeholder="00" required />
                <p id="username-proxies-label">Username</p>
                <input id="username-proxies" type="text" placeholder="" required />
                <p id="password-proxies-label">Password</p>
                <input id="password-proxies" type="text" placeholder="" required />
                <button id="destroy-proxies" onClick={this.destroyProxies} >Destroy All</button>
                <button id="generate-proxies" onClick={this.generateProxies} >Generate</button>

                {/*CONNECT*/}
                <p className="body-text" id="server-label">Connect</p>
                <div id="server-box" />
                <p id="type-server-label">Type</p>
                <select id="type-server" onChange={this.props.onServerChoiceChange} value={this.props.selectedServer.serverName || ''} required>
                        <option value="" hidden>{'Choose Server'}</option>
                        {this.buildServerChoices()}
                </select>
                <img src={DDD} id="type-server-button" />
                <p id="size-server-label">Size</p>
                <select id="size-server" onChange={this.props.onServerSizeChoiceChange} value={this.props.selectedServer.serverSize || ''} disabled={!!this.props.selectedServer.serverName} required>
                    <option value="" hidden>{'Choose Size'}</option>
                    {this.buildServerSizeChoices()}
                </select>
                <img src={DDD} id="size-server-button" />
                <p id="location-server-label">Location</p>
                <select id="location-server" onChange={this.props.onServerLocationChoiceChange} value={this.props.selectedServer.serverLocation || ''} disabled={!!this.props.selectedServer.serverSize} required>
                    <option value=""  hidden>{'Choose Location'}</option>
                    {this.buildServerLocationChoices()}
                </select>
                <img src={DDD} id="location-server-button" />
                <button id="destroy-server" onClick={this.destroyServer} >Destroy</button>
                <button id="create-server" onClick={this.createServer} >Create</button>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        selectedServer: state.selectedServer,
        serverName: state.serverName,
        serverSize: state.serverSize,
        serverLocation: state.serverLocation
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
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
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Server);