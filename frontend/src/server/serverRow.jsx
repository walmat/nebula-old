import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import stop from '../_assets/stop.svg';
import start from '../_assets/run.svg';
import destroy from '../_assets/destroy.svg';

import defns from '../utils/definitions/serverDefinitions';
import { serverActions } from '../state/actions/server/serverActions';
import './server';
import addTestId from '../utils/addTestId';

export class ServerRowPrimitive extends Component {
  renderTableRowActionButton(tag, desc, src, className, onClick) {
    return (
      <div className="server-row__actions__button">
        {this.renderTableRowButton(`action.${tag}`, desc, src, className, onClick)}
      </div>
    );
  }

  renderTableRowButton(tag, desc, src, className, onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        title={desc}
        onKeyPress={this.props.onKeyPress}
        onClick={onClick}
        data-testid={addTestId(`ServerRow.tableRowButton.${tag}`)}
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
    return this.renderTableRowActionButton(
      'start',
      'Start Server',
      start,
      server.status === 'running' ? 'active' : '',
      () => { this.props.onStartServer(server, serverInfo.credentials); },
    );
  }

  renderTableRowStopActionButton() {
    const { server, serverInfo } = this.props;
    return this.renderTableRowActionButton(
      'stop',
      'Stop Server',
      stop,
      server.status === 'stopped' ? 'active' : '',
      () => { this.props.onStopServer(server, serverInfo.credentials); },
    );
  }

  renderTableRowDestroyActionButton() {
    const { server, serverInfo } = this.props;
    return this.renderTableRowActionButton(
      'destroy',
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
        <div className="col col--no-gutter server-row__size">{server.size.label}</div>
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

ServerRowPrimitive.propTypes = {
  server: defns.server.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onStartServer: PropTypes.func.isRequired,
  onStopServer: PropTypes.func.isRequired,
  onDestroyServer: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

ServerRowPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  server: ownProps.server,
  serverInfo: state.serverInfo,
});

export const mapDispatchToProps = dispatch => ({
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

export default connect(mapStateToProps, mapDispatchToProps)(ServerRowPrimitive);
