import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import stop from '../_assets/stop.svg';
import { serverActions } from '../state/actions/server/serverActions';
import './server';

class ServerLog extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.connect = this.connect.bind(this);
    this.destroy = this.destroy.bind(this);
    this.stop = this.stop.bind(this);
  }

  connect(opts) {
    console.log('starting server: ', opts);
    this.props.onConnect(opts);
  }

  stop(opts) {
    console.log('stopping server: ', opts);
    this.props.onStop(opts);
  }

  destroy(opts) {
    console.log('destroying server: ', opts);
    this.props.onDestroy(opts);
  }

  createTable() {
    const table = [];
    for (let i = 0; i < this.props.servers.length; i += 1) {
      const server = this.props.servers[i];
      table.push((
        <tr key={server.type} id={server.type} className="server_row">
          <td className="blank" />
          <td className="server-log-type">
            <p>{server.type}</p>
          </td>
          <td className="server-log-size">
            <p>{server.size}</p>
          </td>
          <td className="server-log-location">
            <p>{server.location}</p>
          </td>
          <td className="server-log-charges">
            <p>{server.charges}</p>
          </td>
          <td className="server-log-status">
            <p>{server.status}</p>
          </td>
          <td className="server-log-action">
            <img
              src={server.status === 'connected' ? stop : start}
              alt={server.status === 'connected' ? 'stop' : 'start'}
              onClick={() => { this.connect(server); }}
              onKeyPress={() => {}}
            />
          </td>
          <td className="blank" />
        </tr>
      ));
    }
    return table;
  }

  render() {
    return (
      <table>
        <tbody>{this.createTable()}</tbody>
      </table>
    );
  }
}

const mapStateToProps = state => ({
  servers: state.servers,
});

const mapDispatchToProps = dispatch => ({
  onConnect: (opts) => {
    dispatch(serverActions.start(opts.id));
  },
  onStop: (opts) => {
    dispatch(serverActions.stop(opts.id));
  },
  onDestroy: (opts) => {
    dispatch(serverActions.remove(opts.id));
  },
});

ServerLog.propTypes = {
  servers: PropTypes.objectOf(PropTypes.any).isRequired,
  onConnect: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onDestroy: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ServerLog);
