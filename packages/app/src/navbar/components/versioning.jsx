import React from 'react';

import { getAppData } from '../../constants/bridgeFns';

export default () => {
  const { name, version } = getAppData();
  return (
    <div className="row navbar__text--gap">
      <div className="col col--gutter col--expand">
        <div className="row row--expand row--gutter">
          <div>
            <p className="navbar__text--app-name">{name.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="row row--expand row--gutter">
          <div>
            <p className="navbar__text--app-version">{version}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
