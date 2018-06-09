import React, { Component } from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';

const REACT_APP_DISCORD_ID = process.env.REACT_APP_DISCORD_ID;
const REACT_APP_DISCORD_SECRET = process.env.REACT_APP_DISCORD_SECRET;
const redirect = 'http://localhost:3000/auth';

class Auth extends Component {
	constructor(props) {
        super(props);
        this.state = {
            error: false
        };
	}

	async componentDidMount() {
		try {
            console.log('hey!!')
			const params = queryString.parse(this.props.location.search);
			const discordCode = params.code;
			const nebulaCredentials = btoa(`${REACT_APP_DISCORD_ID}:${REACT_APP_DISCORD_SECRET}`);
			let response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${discordCode}&redirect_uri=${redirect}`,
			{
                method: 'POST',
                headers: {
                    Authorization: `Basic ${nebulaCredentials}`,
                },
			});
			let discordAuthInfo = await response.json();

			if (discordAuthInfo.error) {
				this.setState({error: true});
				return;
			}

			// we got the discord auth info, now get the user informaiton
			response = await fetch(`http://localhost:8080/user/${discordAuthInfo.access_token}`, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			});

			let userInfo = await response.json();
			console.log(userInfo);

			//check the discord uid against the server and get the registration key

		} catch (err) {
			console.log(err);
			this.setState({error: true});
		}

	}

    render() {
		if (this.state.error) {
			return (
				<div>
					<h1 style={{textAlign: 'center'}}> Authentication Failed... </h1>
				</div>
			)
		}
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