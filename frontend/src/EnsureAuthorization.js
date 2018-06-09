import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';
import { ENGINE_METHOD_CIPHERS } from 'constants';

const REACT_APP_DISCORD_ID = process.env.REACT_APP_DISCORD_ID;
const redirect = 'http://localhost:3000/auth';
const authURL = `https://discordapp.com/oauth2/authorize?client_id=${REACT_APP_DISCORD_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`;

class EnsureAuthorization extends Component {
    constructor(props) {
        super(props);
    }

    handleAuthentication = async () => {
        let token = localStorage.getItem('authToken');
        if (!token) {
            // login
            return window.location = authURL
        }

        // check that token is valid
        let response = await fetch('http://localhost:8080/auth',
        {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-access-token': token
            }
        });

        let result = await response.json();
        if (!result.auth) {
            window.location = authURL
        }
    }

    async componentDidMount() {
        console.log(this.props.location);
        //TODO At some point we should add a timestamp to when the token was created.
        //This will allow us to know when to refresh and allow us to track if we already ensured we are authorized in the state of this component
        //Therefor we will have less calls going out to the nebula api and better performance
        if (this.props.location.pathname !== '/auth') {
            this.handleAuthentication();
        }
    }

    render() {
        return this.props.children;
    }
}

EnsureAuthorization.propTypes = {
  children: PropTypes.node,
  location: PropTypes.object,
  history: PropTypes.object
};

export default EnsureAuthorization;
