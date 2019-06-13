import React, { Component } from 'react';
import { connect } from 'react-redux';

import ProxyLogRow from './proxyLogRow';

// import ServerRow from './serverRow';
import defns from '../utils/definitions/serverDefinitions';

export class ProxyLogPrimitive extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    const { proxies } = this.props;

    if (!proxies.length || proxies.length === nextProps.proxies.length) {
      return false;
    }
    return true;
  }

  createTable() {
    const { proxies } = this.props;

    if (!proxies.length) {
      return [];
    }

    return proxies.map(p => <ProxyLogRow key={p.InstanceId} proxy={p} />);
  }

  render() {
    console.log('updating proxy log component');
    return <div className="server-table">{this.createTable()}</div>;
  }
}

ProxyLogPrimitive.propTypes = {
  proxies: defns.proxyList.isRequired,
};

ProxyLogPrimitive.defaultProps = {
  // eslint-disable-next-line react/default-props-match-prop-types
  errors: {}, // TODO - add proper error object
};

export const mapStateToProps = state => ({
  proxies: state.servers.proxies,
});

export default connect(mapStateToProps)(ProxyLogPrimitive);
