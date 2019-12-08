import React from 'react';

import VariationField from './variation';
import CheckoutDelayField from './delay';
import CategorySelect from './category';
import Captcha from '../shared/captcha';
import AmountField from '../shared/amount';
import CreateButton from '../shared/button';

const SupremeOptions = () => (
  <>
    <div className="col col--expand tasks--create__input-group">
      <div className="row row--gutter">
        <CategorySelect />
        <VariationField />
        <CheckoutDelayField />
      </div>
    </div>
    <div className="col col--expand tasks--create__input-group">
      <div className="row row--gutter">
        <Captcha />
        <AmountField />
        <CreateButton />
      </div>
    </div>
  </>
);

export default SupremeOptions;
