/* eslint-disable no-nested-ternary */
import React from 'react';
import { addTestId, renderSvgIcon } from '../utils';
import sDefns from '../utils/definitions/serverDefinitions';

import { ReactComponent as Running } from '../_assets/running.svg';
import { ReactComponent as Pending } from '../_assets/pending.svg';
import { ReactComponent as Stopped } from '../_assets/stopped.svg';

const ProxyLogRow = ({
  proxy: {
    id,
    proxy,
    credentials: { AWSAccessKey },
    region,
    status,
    speed,
  },
}) => (
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
        <div className="col col--no-gutter proxy-log__row--actions__button">
          {renderSvgIcon()}
        </div>
        {/* TODO: ACTIONS HERE, test, stop, start, terminate */}
      </div>
    </div>
  </div>
);

ProxyLogRow.propTypes = {
  proxy: sDefns.proxy.isRequired,
};

export default ProxyLogRow;
