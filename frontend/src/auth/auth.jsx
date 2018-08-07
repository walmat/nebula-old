import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import queryString from 'query-string';
import qs from 'qs';

const { REACT_APP_DISCORD_SECRET } = process.env.REACT_APP_DISCORD_SECRET;
const { REACT_APP_DISCORD_ID } = process.env.REACT_APP_DISCORD_ID;
const redirect = 'http://localhost:3000/auth';
const authURL = `https://discordapp.com/oauth2/authorize?client_id=${REACT_APP_DISCORD_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`;

class Auth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
    };
  }

  async componentDidMount() {
    try {
      const params = qs.parse(this.props.location.search);
      if (params.code) {
        const discordCode = params.code;
        const nebulaCredentials = btoa(`${REACT_APP_DISCORD_ID}:${REACT_APP_DISCORD_SECRET}`);
        let response = await fetch(
          `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${discordCode}&redirect_uri=${redirect}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${nebulaCredentials}`,
            },
          },
        );
        const discordAuthInfo = await response.json();

        if (discordAuthInfo.error) {
          this.setState({ error: true });
          return;
        }

        // we got the discord auth info, now get the jwt token
        response = await fetch(`http://localhost:8080/user/${discordAuthInfo.access_token}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        if (!result.auth) {
          this.setState({ error: true });
          return;
        }

        localStorage.setItem('authToken', result.token);
        this.props.history.push('/tasks');
      } else {
        // redirect to discord for token
        window.location = authURL;
      }
    } catch (err) {
      console.log(err);
      this.setState({ error: true });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <h1 style={{ textAlign: 'center' }}> Authentication Failed... </h1>
        </div>
      );
    }
    return (
      <div>
        <h1 style={{ textAlign: 'center' }}> Authenticating... </h1>
      </div>
    );
  }
}

Auth.propTypes = {
  history: PropTypes.objectOf(PropTypes.any).isRequired,
  location: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default Auth;
