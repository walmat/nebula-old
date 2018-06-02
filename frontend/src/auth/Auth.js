import React, { Component } from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';

const REACT_APP_DISCORD_ID = process.env.REACT_APP_DISCORD_ID;
const REACT_APP_DISCORD_SECRET = process.env.REACT_APP_DISCORD_SECRET;
const redirect = 'http://localhost:3000/auth';

class Auth extends Component {
	async componentDidMount() {
		try {
			const params = queryString.parse(this.props.location.search);
			const discordCode = params.code;
			const nebulaCredentials = btoa(`${REACT_APP_DISCORD_ID}:${REACT_APP_DISCORD_SECRET}`);
			const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${discordCode}&redirect_uri=${redirect}`,
			{
			  method: 'POST',
			  headers: {
				Authorization: `Basic ${nebulaCredentials}`,
			  },
			});
		  let discordUserInfo = await response.json();
		  console.log(discordUserInfo);
		} catch (err) {

		}

	}

    render() {
		return (
			<div>
				<h1 style={{textAlign: 'center'}}> Authenticating... </h1>
			</div>
		)
    }
}

Auth.propTypes = {
	history: PropTypes.object,
	location: PropTypes.object
};

export default Auth;