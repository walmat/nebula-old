import React from 'react';

import OneCheckout from './oneCheckout';
import RestockMode from './restockMode';
import AccountSelect from './account';
import TaskMode from './taskMode';
import Captcha from '../shared/captcha';
import AmountField from '../shared/amount';
import CreateButton from '../shared/button';

const ShopifyOptions = () => (
  <>
    <div className="row row--start row--expand">
      <AccountSelect />
      <OneCheckout />
      <RestockMode />
    </div>
    <div className="row row--start row--expand">
      <TaskMode />
      <Captcha />
      <AmountField />
      <CreateButton />
    </div>
  </>
);

export default ShopifyOptions;
