import React from 'react';
import PropTypes from 'prop-types';

import PlatformFields from './platform';
import CloseModal from './shared/close';
import ProductField from './shared/product';
import StoreSelect from './shared/store';
import ProfileSelect from './shared/profile';
import SizeSelect from './shared/sizes';
import Schedule from './shared/schedule';
import Captcha from './shared/captcha';
import AmountField from './shared/amount';
import CreateButton from './shared/button';
import RandomInStockToggle from './shared/randomInStock';

const ModalBody = ({ toggleCreate }) => (
  <>
    <CloseModal toggleCreate={toggleCreate} />
    <div className="create-tasks col col--expand col--no-gutter">
      <div className="row row--start row--expand">
        <ProductField />
        <StoreSelect />
      </div>
      <div className="row row--start row--expand">
        <ProfileSelect />
        <SizeSelect />
        <RandomInStockToggle />
      </div>
      <PlatformFields />
      <div className="row row--start row--expand">
        <Schedule />
        <Captcha />
        <AmountField />
        <CreateButton />
      </div>
    </div>
  </>
);

ModalBody.propTypes = {
  toggleCreate: PropTypes.func.isRequired,
};

export default ModalBody;
