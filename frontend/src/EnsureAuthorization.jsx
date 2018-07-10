import React, { Component } from 'react';
import PropTypes from 'prop-types';

const ensureAuthorization = (ComposedComponent) => {
  class EnsureAuthorization extends Component {
    async componentDidMount() {
      await this.checkAuthentication();
    }

    async checkAuthentication() {
      if (process.env.NODE_ENV === 'development') {
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          // login
          this.props.history.push('/auth');
        }

        // check that token is valid
        const response = await fetch('http://localhost:8080/auth', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-access-token': token,
          },
        });

        const result = await response.json();
        if (!result.auth) {
          this.props.history.push('/auth');
        }
      } catch (err) {
        console.log(err);
      }
    }

    render() {
      return <ComposedComponent {...this.props} {...this.state} />;
    }
  }

  EnsureAuthorization.propTypes = {
    location: PropTypes.objectOf(PropTypes.any).isRequired,
    history: PropTypes.objectOf(PropTypes.any).isRequired,
  };

  return EnsureAuthorization;
};

export default ensureAuthorization;
