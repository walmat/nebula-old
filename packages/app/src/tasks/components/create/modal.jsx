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
import LocalhostToggle from './shared/localhostToggle';

const ModalBody = ({ toggleCreate }) => (
  <div className="create-tasks col col--expand col--no-gutter">
    <CloseModal toggleCreate={toggleCreate} />
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
    <div className="row row--start row--expand" style={{ marginTop: 6 }}>
      <Schedule />
      <Captcha />
      <LocalhostToggle />
    </div>
    <div className="row row--end row--expand" style={{ alignItems: 'flex-end' }}>
      <AmountField />
      <CreateButton />
    </div>
  </div>
);

ModalBody.propTypes = {
  toggleCreate: PropTypes.func.isRequired,
};

export default ModalBody;
