/* eslint-disable no-nested-ternary */
import React, { Component, memo } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addTestId, renderSvgIcon } from '../utils';
import { serverActions } from '../state/actions';
import sDefns from '../utils/definitions/serverDefinitions';

import { ReactComponent as Running } from '../_assets/running.svg';
import { ReactComponent as Pending } from '../_assets/pending.svg';
import { ReactComponent as Stopped } from '../_assets/stopped.svg';
import { ReactComponent as Test } from '../_assets/test.svg';
import { ReactComponent as Terminate } from '../_assets/destroy.svg';

export class ProxyLogRowPrimitive extends Component {
  constructor(props) {
    super(props);

    this.test = this.test.bind(this);
    this.terminate = this.terminate.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    const {
      proxy: {
        id,
        proxy,
        credentials: { AWSAccessKey, AWSSecretKey },
        region,
        status,
        speed,
      },
    } = this.props;

    if (
      id !== nextProps.proxy.id ||
      proxy !== nextProps.proxy.proxy ||
      AWSAccessKey !== nextProps.proxy.credentials.AWSAccessKey ||
      AWSSecretKey !== nextProps.proxy.credentials.AWSSecretKey ||
      region !== nextProps.proxy.region ||
      status !== nextProps.proxy.status ||
      speed !== nextProps.proxy.speed
    ) {
      return true;
    }

    return false;
  }

  test() {
    const {
      proxy: { proxy, status },
      onTestProxy,
    } = this.props;

    if (status === 'running') {
      onTestProxy('https://kith.com', proxy);
    }
  }

  terminate() {
    const {
      proxy: {
        id,
        proxy,
        region,
        credentials: { AWSAccessKey, AWSSecretKey },
      },
      onTerminateProxy,
    } = this.props;

    onTerminateProxy(
      { location: { value: region } },
      { id, proxy },
      { label: AWSAccessKey, value: AWSSecretKey },
    );
  }

  render() {
    const {
      proxy: {
        id,
        proxy,
        credentials: { AWSAccessKey },
        region,
        status,
        speed,
      },
    } = this.props;

    return (
      <div
        key={id}
        className="proxy-row-container col col--no-gutter"
        data-testid={addTestId('ProxyLowRow.container')}
      >
        <div className="row proxy-log">
          <div
            className="col col--no-gutter proxy-log__row--status"
            data-testid={addTestId('ProxyLogRow.status')}
          >
            {status === 'running'
              ? renderSvgIcon(Running)
              : status === 'stopped'
              ? renderSvgIcon(Stopped)
              : renderSvgIcon(Pending)}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--account"
            data-testid={addTestId('ProxyLogRow.account')}
          >
            {AWSAccessKey}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--region"
            data-testid={addTestId('ProxyLogRow.region')}
          >
            {region}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--ip"
            data-testid={addTestId('ProxyLogRow.ip')}
          >
            {proxy ? `${proxy.split(':')[0]}` : 'Not assigned'}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--speed"
            data-testid={addTestId('ProxyLogRow.speed')}
          >
            {speed || 'N/A'}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--actions"
            data-testid={addTestId('ProxyLogRow.actions')}
          >
            <div className="row row--gutter proxy-log__row--actions__margin">
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={this.test}
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
              >
                {renderSvgIcon(Test)}
              </div>
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={this.terminate}
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
              >
                {renderSvgIcon(Terminate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ProxyLogRowPrimitive.propTypes = {
  proxy: sDefns.proxy.isRequired,
  onTestProxy: PropTypes.func.isRequired,
  onTerminateProxy: PropTypes.func.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  proxy: ownProps.proxy,
  site: ownProps.site,
});

export const mapDispatchToProps = dispatch => ({
  onTestProxy: (url, proxy) => {
    dispatch(serverActions.testProxy({ url }, proxy));
  },
  onGenerateProxies: (options, credentials) => {
    dispatch(serverActions.generateProxies(options, credentials));
  },
  onTerminateProxy: (options, proxy, credentials) => {
    dispatch(serverActions.terminateProxy(options, proxy, credentials));
  },
});

export default memo(
  connect(
    mapStateToProps,
    mapDispatchToProps,
  )(ProxyLogRowPrimitive),
);
