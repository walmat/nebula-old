import React, { Component } from 'react';
import { object } from 'prop-types';

/* eslint-disable */
const withReducer = (key, reducer) => WrappedComponent => {
  class Extended extends Component {

    render() {
      const { store } = this.context;
      store.injectReducer(key, reducer);
      return <WrappedComponent {...this.props} />;
    }
  }

  Extended.contextTypes = {
    store: object,
  };

  return Extended;
};

export default withReducer;
