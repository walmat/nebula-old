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
    <div className="col col--expand tasks--create__input-group">
      <div className="row row--gutter">
        <AccountSelect />
        <OneCheckout />
        <RestockMode />
      </div>
    </div>
    <div className="col col--expand tasks--create__input-group">
      <div className="row row--gutter">
        <TaskMode />
        <Captcha />
        <AmountField />
        <CreateButton />
      </div>
    </div>
  </>
);

export default ShopifyOptions;
