import React from 'react';

import OneCheckout from './oneCheckout';
import RestockMode from './restockMode';
import AccountSelect from './account';
import TaskMode from './taskMode';

const ShopifyOptions = () => (
  <div className="row row--start row--expand">
    <AccountSelect />
    <TaskMode />
    {/* <OneCheckout />
    <RestockMode /> */}
  </div>
);

export default ShopifyOptions;
