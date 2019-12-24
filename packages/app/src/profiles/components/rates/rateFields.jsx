import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import DeleteButton from './button';
import StoreSelect from './storeSelect';
import RateSelect from './rateSelect';
import RateInputs from './rateInputs';

const RatesFields = ({ value }) =>
  value.id ? (
    <div className="col col--expand">
      <div className="row row--start">
        <p className="row row--start row--expand body-text section-header profiles-rates__section-header">
          Shipping Rates
        </p>
      </div>
      <div className="row row--start row--expand">
        <div className="profiles-rates col col--start col--expand col--no-gutter">
          <div className="row row--start row--expand row--no-gutter">
            <div className="col col--start col--expand profiles-rates__input-group">
              <div className="row row--start row--expand row--gutter">
                <StoreSelect profile={value} />
                <RateSelect profile={value} />
              </div>
              <RateInputs profile={value} />
              <DeleteButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

RatesFields.propTypes = {
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  value: state.CurrentProfile,
});

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(RatesFields);
