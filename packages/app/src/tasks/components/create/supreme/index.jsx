import React from 'react';

import VariationField from './variation';
import CheckoutDelayField from './delay';
import CategorySelect from './category';

const SupremeOptions = () => (
  <div className="row row--start row--expand">
    <CategorySelect />
    <VariationField />
    <CheckoutDelayField />
  </div>
);

export default SupremeOptions;
