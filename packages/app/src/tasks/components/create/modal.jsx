import React from 'react';
import PropTypes from 'prop-types';

import PlatformFields from './platform';
import CloseModal from './shared/close';
import ProductField from './shared/product';
import StoreSelect from './shared/store';
import ProfileSelect from './shared/profile';
import SizeSelect from './shared/sizes';
import RandomInStockToggle from './shared/randomInStock';

const ModalBody = ({ toggleCreate }) => (
  <>
    <CloseModal toggleCreate={toggleCreate} />
    <div className="tasks--create col col--expand col--no-gutter">
      <div className="col col--expand tasks--create__input-group">
        <div className="row row--gutter">
          <ProductField />
          <StoreSelect />
        </div>
      </div>
      <div className="col col--expand tasks--create__input-group">
        <div className="row row--gutter">
          <ProfileSelect />
          <SizeSelect />
          <RandomInStockToggle />
        </div>
      </div>
      <PlatformFields />
    </div>
  </>
);

ModalBody.propTypes = {
  toggleCreate: PropTypes.func.isRequired,
};

export default ModalBody;
