import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import stop from '../_assets/stop.svg';
import start from '../_assets/run.svg';
import destroy from '../_assets/destroy.svg';

import defns from '../utils/definitions/serverDefinitions';
import { serverActions } from '../state/actions/server/serverActions';
import './server';

class ServerRow extends Component {
  static renderTableRowActionButton(desc, src, className, onClick) {
    return (
      <div className="server-row__actions__button">
        {ServerRow.renderTableRowButton(desc, src, className, onClick)}
      </div>
    );
  }

  static renderTableRowButton(desc, src, className, onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        title={desc}
        onKeyPress={() => {}}
        onClick={onClick}
      >
        <img
          src={src}
          alt={desc}
          draggable="false"
          className={className}
        />
      </div>
    );
  }

  renderTableRowStartActionButton() {
    const { server, serverInfo } = this.props;
    return ServerRow.renderTableRowButton(
      'Start Server',
      start,
      server.status === 'running' ? 'active' : '',
      () => { this.props.onStartServer(server, serverInfo.credentials); },
    );
  }

  renderTableRowStopActionButton() {
    const { server, serverInfo } = this.props;
    return ServerRow.renderTableRowActionButton(
      'Stop Server',
      stop,
      server.status === 'stopped' ? 'active' : '',
      () => { this.props.onStopServer(server, serverInfo.credentials); },
    );
  }

  renderTableRowDestroyActionButton() {
    const { server, serverInfo } = this.props;
    return ServerRow.renderTableRowActionButton(
      'Destroy Server',
      destroy,
      '',
      () => { this.props.onDestroyServer(server, serverInfo.credentials); },
    );
  }

  renderTableRow() {
    const { server } = this.props;
    return (
      <div key={server.id} className="server-row row">
        <div className="col col--no-gutter server-row__type">{server.type.label}</div>
        <div className="col col--no-gutter server-row__size">{server.sizes.label}</div>
        <div className="col col--no-gutter server-row__location">{server.location.label}</div>
        <div className="col col--no-gutter server-row__charges">{server.charges}</div>
        <div className="col col--no-gutter server-row__status">{server.status}</div>
        <div className="col col--no-gutter server-row__actions">
          <div className="row row--gutter">
            {this.renderTableRowStartActionButton()}
            {this.renderTableRowStopActionButton()}
            {this.renderTableRowDestroyActionButton()}
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="server-row-container col">
        { this.renderTableRow() }
      </div>
    );
  }
}

ServerRow.propTypes = {
  server: defns.server.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onStartServer: PropTypes.func.isRequired,
  onStopServer: PropTypes.func.isRequired,
  onDestroyServer: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  server: ownProps.server,
  serverInfo: state.serverInfo,
});

const mapDispatchToProps = dispatch => ({
  onStartServer: (serverOptions, awsCredentials) => {
    dispatch(serverActions.start(serverOptions, awsCredentials));
  },
  onStopServer: (serverOptions, awsCredentials) => {
    dispatch(serverActions.stop(serverOptions, awsCredentials));
  },
  onDestroyServer: (serverOptions, awsCredentials) => {
    dispatch(serverActions.destroy(serverOptions, awsCredentials));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ServerRow);
