import React from 'react';
import { addTestId } from '../utils';
import sDefns from '../utils/definitions/serverDefinitions';

const ProxyLogRow = ({
  proxy: {
    id,
    proxy,
    region,
    speed,
    credentials: { AWSAcessKey },
    status,
    charges,
  },
}) => (
  <div
    key={id}
    className="proxy-row-container col"
    data-testid={addTestId('ProxyLowRow.container')}
  >
    <div className="row">
      <div className="col proxy-log__row--status" data-testid={addTestId('ProxyLogRow.status')}>
        {status}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--region"
        data-testid={addTestId('ProxyLogRow.location')}
      >
        {region}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--proxy"
        data-testid={addTestId('ProxyLogRow.ip')}
      >
        {proxy}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--credentials"
        data-testid={addTestId('ProxyLogRow.credentials')}
      >
        {AWSAcessKey}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--charges"
        data-testid={addTestId('ProxyLogRow.charges')}
      >
        {charges}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--speed"
        data-testid={addTestId('ProxyLogRow.speed')}
      >
        {speed}
      </div>
      <div
        className="col col--no-gutter proxy-log__row--actions"
        data-testid={addTestId('ProxyLogRow.actions')}
      >
        {/* TODO: ACTIONS HERE */}
      </div>
    </div>
  </div>
);

ProxyLogRow.propTypes = {
  proxy: sDefns.proxy.isRequired,
};

export default ProxyLogRow;
