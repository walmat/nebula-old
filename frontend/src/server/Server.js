import React, { Component } from 'react';

import './Server.css';

class Server extends Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

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
                <select id="type-server" required></select>
                <p id="size-server-label">Size</p>
                <select id="size-server" required></select>
                <p id="location-server-label">Location</p>
                <select id="location-server" required></select>
                <button id="destroy-server" onClick={this.destroyServer} >Destroy</button>
                <button id="create-server" onClick={this.createServer} >Create</button>

            </div>
        );
    }
}

export default Server;