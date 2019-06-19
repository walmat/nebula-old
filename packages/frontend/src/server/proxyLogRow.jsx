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
import { ReactComponent as Terminate } from '../_assets/destroy.svg';

export class ProxyLogRowPrimitive extends PureComponent {
  constructor(props) {
    super(props);

    this.test = this.test.bind(this);
    this.terminate = this.terminate.bind(this);
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

    let Icon = null;
    switch (status) {
      case status === 'running': {
        Icon = Running;
        break;
      }
      case status === 'stopped': {
        Icon = Stopped;
        break;
      }
      default: {
        Icon = Pending;
        break;
      }
    }

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
            {renderSvgIcon(Icon)}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--account"
            data-testid={addTestId('ProxyLogRow.account')}
            data-private
          >
            {AWSAccessKey}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--region"
            data-testid={addTestId('ProxyLogRow.region')}
            data-private
          >
            {region}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--ip"
            data-testid={addTestId('ProxyLogRow.ip')}
            data-private
          >
            {proxy ? `${proxy.split(':')[0]}` : 'Not assigned'}
          </div>
          <div
            className="col col--no-gutter proxy-log__row--speed"
            data-testid={addTestId('ProxyLogRow.speed')}
            data-private
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProxyLogRowPrimitive);
