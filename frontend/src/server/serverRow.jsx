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
      <div className="task-row__actions__button">
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
    const { server } = this.props;
    return ServerRow.renderTableRowButton(
      'Start Server',
      start,
      server.status === 'running' ? 'active' : '',
      () => { this.props.onStartServer(server); },
    );
  }

  renderTableRowStopActionButton() {
    const { server } = this.props;
    return ServerRow.renderTableRowActionButton(
      'Stop Server',
      stop,
      server.status === 'stopped' ? 'active' : '',
      () => { this.props.onStopServer(server); },
    );
  }

  renderTableRowDestroyActionButton() {
    const { server } = this.props;
    return ServerRow.renderTableRowActionButton(
      'Destroy Server',
      destroy,
      '',
      () => { this.props.onDestroyServer(server); },
    );
  }

  renderTableRow() {
    const { server } = this.props;
    console.log(server);
    return (
      <div key={server.id} className="tasks-row row">
        <div className="col col--no-gutter tasks-row__id">{server.type}</div>
        <div className="col col--no-gutter tasks-row__product">{server.size}</div>
        <div className="col col--no-gutter tasks-row__sites">{server.location}</div>
        <div className="col col--no-gutter tasks-row__profile">{server.charges}</div>
        <div className="col col--no-gutter tasks-row__product">{server.status}</div>
        <div className="col col--no-gutter tasks-row__actions">
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
      <div className="tasks-row-container col">
        { this.renderTableRow() }
      </div>
    );
  }
}

ServerRow.propTypes = {
  server: defns.serverRow.isRequired,
  onStartServer: PropTypes.func.isRequired,
  onStopServer: PropTypes.func.isRequired,
  onDestroyServer: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  server: ownProps.server,
});

const mapDispatchToProps = dispatch => ({
  onStartServer: (opts) => {
    dispatch(serverActions.start(opts.id));
  },
  onStoServerp: (opts) => {
    dispatch(serverActions.stop(opts.id));
  },
  onDestroyServer: (opts) => {
    dispatch(serverActions.destroy(opts.id));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ServerRow);
