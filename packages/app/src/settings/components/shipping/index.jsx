import React from 'react';

import ProductField from './product';
import ProfileSelect from './profile';
import StoreSelect from './store';
import ActionButtons from './buttons';

const ShippingManagerPrimitive = () => (
  <div className="row row--start row--expand row--gutter" style={{ flexGrow: 0 }}>
    <div className="col col--start col--expand col--no-gutter">
      <div className="row row--start row--gutter">
        <div className="col col--no-gutter-left">
          <p className="body-text section-header settings--shipping-manager__section-header">
            Shipping Manager
          </p>
        </div>
      </div>
      <div className="row row--start row--gutter-left">
        <div className="col col--start col--expand col--no-gutter">
          <div className="row row--start row--expand row--no-gutter-left">
            <div className="col col--start col--expand settings--shipping-manager__input-group">
              <div className="row row--start row--expand row--gutter" style={{ margin: '15px 0' }}>
                <ProductField />
                <ProfileSelect />
              </div>
              <div
                className="row row--start row--expand row--gutter"
                style={{ marginBottom: '15px' }}
              >
                <StoreSelect />
                <ActionButtons />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ShippingManagerPrimitive;
