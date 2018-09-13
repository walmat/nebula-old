import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import defns from '../utils/definitions/serverDefinitions';
import { serverActions } from '../state/actions/server/serverActions';
import './server';

class ServerLog extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
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
          <td
            className={server.status === 'Connected' ? 'server-log-action active' : 'server-log-action'}
            role="button"
            tabIndex={0}
            onClick={() => { this.props.onStart(server); }}
            onKeyPress={() => {}}
          >
            <img src={start} alt="" />
          </td>
          <td
            className="server-log-action"
            role="button"
            tabIndex={0}
            onClick={() => { this.props.onStop(server); }}
            onKeyPress={() => {}}
          >
            <img src={stop} alt="" />
          </td>
          <td
            className="server-log-action"
            id="action-last"
            role="button"
            tabIndex={0}
            onClick={() => { this.props.onDestroy(server); }}
            onKeyPress={() => {}}
          >
            <img src={destroy} alt="" />
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

ServerLog.propTypes = {
  servers: defns.serverList.isRequired,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onDestroy: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  servers: state.servers,
});

const mapDispatchToProps = dispatch => ({
  onStart: (opts) => {
    dispatch(serverActions.start(opts.id));
  },
  onStop: (opts) => {
    dispatch(serverActions.stop(opts.id));
  },
  onDestroy: (opts) => {
    console.log(opts.id);
    dispatch(serverActions.destroy(opts.id));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ServerLog);
