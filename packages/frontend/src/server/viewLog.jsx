import React, { Component } from 'react';
import { connect } from 'react-redux';

// import ServerRow from './serverRow';
import defns from '../utils/definitions/serverDefinitions';

export class ViewLogPrimitive extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    // const table = servers.map(server => <ServerRow key={server.id} server={server} />);
    return [];
  }

  render() {
    return <div className="server-table">{this.createTable()}</div>;
  }
}

export const mapStateToProps = state => ({
  proxies: state.servers.proxies,
});

export default connect(mapStateToProps)(ViewLogPrimitive);
