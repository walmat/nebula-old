import React, { Component } from 'react';
import { connect } from 'react-redux';

import ServerRow from './serverRow';
import defns from '../utils/definitions/serverDefinitions';

export class ViewLogPrimitive extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const table = this.props.servers.map(server => (<ServerRow key={server.id} server={server} />));
    return table;
  }

  render() {
    return (
      <div className="server-table">
        {this.createTable()}
      </div>
    );
  }
}

export const mapStateToProps = state => ({
  servers: state.servers,
});

ViewLogPrimitive.propTypes = {
  servers: defns.serverList.isRequired,
};

export default connect(mapStateToProps)(ViewLogPrimitive);
