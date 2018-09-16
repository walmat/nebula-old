import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import stop from '../_assets/stop.svg';
import start from '../_assets/run.svg';
import destroy from '../_assets/destroy.svg';

import defns from '../utils/definitions/serverDefinitions';
import { serverActions } from '../state/actions/server/serverActions';
import './server';

const AWS = require('aws-sdk');

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

  /**
   * see https://github.com/awsdocs/aws-doc-sdk-examples/blob/master/javascript/example_code/ec2/ec2_createinstances.js
   */
  async createServerInstance() {
    AWS.config = new AWS.Config({
      accessKeyId: this.props.serverInfo.credentials.AWSAccessKey,
      secretAccessKey: this.props.serverInfo.credentials.AWSSecretKey,
      region: this.props.server.location.value,
    });

    // ec2 object
    const ec2 = new AWS.EC2();

    // create a keypair
    ec2.createKeyPair({ KeyName: this.props.server.id }, (err, data) => {
      if (err) {
        console.log('error', err);
      } else {
        // use this in creating the instance
        console.log(JSON.stringify(data));
      }
    });

    // parameters for the instance
    const instanceParams = {
      ImageId: '',
      InstanceType: this.props.server.sizes.value,
      KeyName: '',
      MinCount: 1,
      MaxCount: 1,
    };

    await ec2.runInstances(instanceParams).promise().then((data) => {
      console.log(data);
      const instanceId = data.Instances[0].InstanceId;
      console.log('Created instance', instanceId);
      // Add tags to the instance
      const tagParams = {
        Resources: [instanceId],
        Tags: [
          {
            Key: '',
            Value: '',
          },
        ],
      };
      // Create a promise on an EC2 service object
      const tagPromise = new AWS.EC2().createTags(tagParams).promise();
      // Handle promise's fulfilled/rejected states
      tagPromise.then((d) => {
        console.log('Instance tagged');
      }).catch((err) => {
        console.error(err, err.stack);
      });
    }).catch((err) => {
      console.error(err, err.stack);
    });
    console.log(ec2);
  }

  renderTableRowStartActionButton() {
    const { server } = this.props;
    return ServerRow.renderTableRowButton(
      'Start Server',
      start,
      server.status === 'running' ? 'active' : '',
      () => { this.connectAWS(); },
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
    return (
      <div key={server.id} className="tasks-row row">
        <div className="col col--no-gutter tasks-row__id">{server.type.label}</div>
        <div className="col col--no-gutter tasks-row__product">{server.sizes.label}</div>
        <div className="col col--no-gutter tasks-row__sites">{server.location.label}</div>
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
