import React from 'react';

import VariationField from './variation';
import CheckoutDelayField from './delay';
import CategorySelect from './category';
import Captcha from '../shared/captcha';
import AmountField from '../shared/amount';
import CreateButton from '../shared/button';

const SupremeOptions = () => (
  <>
    <div className="row row--start row--expand">
      <CategorySelect />
      <VariationField />
      <CheckoutDelayField />
    </div>
    <div className="row row--start row--expand">
      <Captcha />
      <AmountField />
      <CreateButton />
    </div>
  </>
);

export default SupremeOptions;
