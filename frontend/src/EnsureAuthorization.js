import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default function (ComposedComponent) {
    class EnsureAuthorization extends Component {
        constructor(props) {
            super(props);
            this.state = {
                authenticated: true
            }
        }

        checkAuthentication = async () => {
            try {
                let token = localStorage.getItem('authToken');
                if (!token) {
                    // login
                    this.props.history.push('/auth');
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
                    return this.props.history.push('/auth');
                }
            } catch (err) {
                console.log(err);
            }
        }

        componentDidMount = async () => {
            await this.checkAuthentication();
        }

        render() {
            return <ComposedComponent {...this.props} {...this.state} />;
        }
    }

    EnsureAuthorization.propTypes = {
      location: PropTypes.object,
      history: PropTypes.object
    };

    return EnsureAuthorization;
}
