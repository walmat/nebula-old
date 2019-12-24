import React from 'react';

import AccountSelect from './account';
import TaskMode from './taskMode';

const ShopifyOptions = () => (
  <div className="row row--start row--expand">
    <AccountSelect />
    <TaskMode />
  </div>
);

export default ShopifyOptions;
