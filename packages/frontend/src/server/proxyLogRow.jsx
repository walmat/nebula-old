/* eslint-disable no-nested-ternary */
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addTestId, renderSvgIcon } from '../utils';
import { serverActions } from '../state/actions';
import sDefns from '../utils/definitions/serverDefinitions';

import { ReactComponent as Running } from '../_assets/running.svg';
import { ReactComponent as Pending } from '../_assets/pending.svg';
import { ReactComponent as Stopped } from '../_assets/stopped.svg';
import { ReactComponent as Test } from '../_assets/test.svg';
import { ReactComponent as Start } from '../_assets/start.svg';
import { ReactComponent as Stop } from '../_assets/stop.svg';
import { ReactComponent as Terminate } from '../_assets/destroy.svg';

export class ProxyLogRowPrimitive extends PureComponent {
  render() {
    const {
      key,
      proxy: {
        id,
        proxy,
        credentials: { AWSAccessKey, AWSSecretKey },
        region,
        status,
        speed,
      },
      onTestProxy,
      onStopProxy,
      onStartProxy,
      onTerminateProxy,
    } = this.props;

    return (
      <div
        key={key}
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
            {proxy ? `${proxy.split(':')[0]}` : 'Unassigned'}
          </div>
          {/* TODO: Add this in later... */}
          {/* <div
        className="col col--no-gutter proxy-log__row--charges"
        data-testid={addTestId('ProxyLogRow.charges')}
      >
        {charges}
      </div> */}
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
            <div className="row row--gutter">
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={() => onTestProxy('https://kith.com', proxy)}
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
              >
                {renderSvgIcon(Test)}
              </div>
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={() => onStartProxy({ id }, { AWSAccessKey, AWSSecretKey })}
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
              >
                {renderSvgIcon(Start)}
              </div>
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={() => onStopProxy({ id }, { AWSAccessKey, AWSSecretKey })}
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
              >
                {renderSvgIcon(Stop)}
              </div>
              <div
                className="col col--no-gutter proxy-log__row--actions__button"
                onClick={() => onTerminateProxy({ id }, { AWSAccessKey, AWSSecretKey })}
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
  key: PropTypes.string.isRequired,
  proxy: sDefns.proxy.isRequired,
  onTestProxy: PropTypes.func.isRequired,
  onStartProxy: PropTypes.func.isRequired,
  onStopProxy: PropTypes.func.isRequired,
  onTerminateProxy: PropTypes.func.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  key: ownProps.key,
  proxy: ownProps.proxy,
  site: ownProps.site,
});

export const mapDispatchToProps = dispatch => ({
  onTestProxy: (url, proxy) => {
    dispatch(serverActions.testProxy({ url }, proxy));
  },
  onStartProxy: (proxy, credentials) => {
    dispatch(serverActions.start(proxy, credentials));
  },
  onStopProxy: (proxy, credentials) => {
    dispatch(serverActions.stop(proxy, credentials));
  },
  onTerminateProxy: (proxy, credentials) => {
    dispatch(serverActions.terminate(proxy, credentials));
  },
  onGenerateProxies: (options, credentials) => {
    dispatch(serverActions.generateProxies(options, credentials));
  },
  onDestroyProxies: (options, proxies, credentials) => {
    dispatch(serverActions.destroyProxies(options, proxies, credentials));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProxyLogRowPrimitive);
