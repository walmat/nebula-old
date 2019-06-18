import React, { PureComponent } from 'react';
import ScrollableFeed from 'react-scrollable-feed';
import { connect } from 'react-redux';

import ProxyLogRow from './proxyLogRow';
import defns from '../utils/definitions/serverDefinitions';

export class ProxyLogPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const { proxies } = this.props;

    if (!proxies.length) {
      return [];
    }

    return (
      <ScrollableFeed>
        {proxies.map(p => (
          <ProxyLogRow key={p.id} proxy={p} />
        ))}
      </ScrollableFeed>
    );
  }

  render() {
    return (
      <div className="col col--gutter col--expand server-log">
        <div className="row row--gutter row--start">
          <div className="col col--expand col--start">
            <div className="row row--start">
              <p className="body-text section-header server-table__section-header">Log</p>
            </div>
            <div className="row row--expand">
              <div className="col col--start server-table-container">
                <div className="row server-table__header">
                  <div className="col col--no-gutter server-table__header--account">
                    <p>Account</p>
                  </div>
                  <div className="col server-table__header--region">
                    <p>Region</p>
                  </div>
                  <div className="col server-table__header--ip">
                    <p>IP</p>
                  </div>
                  <div className="col server-table__header--speed">
                    <p>Speed</p>
                  </div>
                  <div className="col server-table__header--actions">
                    <p>Actions</p>
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col col--expand">
                    <hr className="view-line" />
                  </div>
                </div>
                <div className="row row--expand row--start">
                  <div className="col server-table__wrapper">
                    <div className="server-table">{this.createTable()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ProxyLogPrimitive.propTypes = {
  proxies: defns.proxyList.isRequired,
};

export const mapStateToProps = state => ({
  proxies: state.servers.proxies,
});

export default connect(mapStateToProps)(ProxyLogPrimitive);
