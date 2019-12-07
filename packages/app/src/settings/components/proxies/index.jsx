import React from 'react';

import ProxyList from './list';

const ProxiesComponent = () => (
  <div className="col col--start col--expand col--no-gutter" style={{ flexGrow: 5, marginTop: 15 }}>
    <ProxyList />
    {/* proxy select and name input to account for more than one list */}
  </div>
);

export default ProxiesComponent;
