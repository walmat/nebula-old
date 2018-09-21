import React, { Component } from 'react';
import { connect } from 'react-redux';

import ServerRow from './serverRow1';
import defns from '../utils/definitions/serverDefinitions';

class ViewLog extends Component {
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

const mapStateToProps = state => ({
  servers: state.servers,
});

ViewLog.propTypes = {
  servers: defns.serverList.isRequired,
};

export default connect(mapStateToProps)(ViewLog);
