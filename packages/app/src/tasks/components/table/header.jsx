import React from 'react';

export default () => (
  <>
    <div className="row row--start row--no-gutter tasks-table__header">
      <div className="col tasks-table__header__product">
        <p>Product / Variation</p>
      </div>
      <div className="col tasks-table__header__store">
        <p>Store</p>
      </div>
      <div className="col tasks-table__header__profile">
        <p>Profile</p>
      </div>
      <div className="col tasks-table__header__sizes">
        <p>Size</p>
      </div>
      <div className="col tasks-table__header__proxy">
        <p>Proxy</p>
      </div>
      <div className="col tasks-table__header__status">
        <p>Status</p>
      </div>
    </div>
    <div className="row row--start">
      <div className="col col--expand">
        <hr className="view-line" />
      </div>
    </div>
  </>
);
