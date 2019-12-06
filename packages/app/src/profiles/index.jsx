import React from 'react';

import SaveProfile from './components/saveProfile';
import LoadProfile from './components/loadProfile';
import LocationFields from './components/location';
import PaymentFields from './components/payment';
import ShippingRatesFields from './components/rates';

import { PROFILE_FIELDS } from '../store/actions';

import '../styles/index.scss';
import './styles/index.scss';

const ProfilesPrimitive = () => (
  <div className="container profiles">
    <div className="row row--start row--expand" style={{ width: '100%' }}>
      <div className="col col--start">
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header profiles__title">Profiles</h1>
          </div>
        </div>
        <LoadProfile />
      </div>
    </div>
    <div className="row row--start row--expand" style={{ width: '100%' }}>
      <LocationFields
        id="shipping"
        header="Shipping"
        className="col col--start col--expand"
        field={PROFILE_FIELDS.EDIT_SHIPPING}
        disabled={false}
      />
      <LocationFields
        id="billing"
        header="Billing"
        className="col col--start col--expand"
        field={PROFILE_FIELDS.EDIT_BILLING}
      />
      <div className="col col--start col--expand">
        <div className="row row--start">
          <PaymentFields className="profiles__fields--payment" />
        </div>
        <div className="row row--start">
          <ShippingRatesFields />
        </div>
      </div>
    </div>
    <SaveProfile />
  </div>
);

export default ProfilesPrimitive;
