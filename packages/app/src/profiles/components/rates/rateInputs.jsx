import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const RateInputs = ({ selectedStore, rates }) => {
  let rateValue = null;

  let siteObject = [];
  if (selectedStore) {
    siteObject = rates.find(v => v.store.url === selectedStore.value);
    if (siteObject) {
      if (siteObject.selectedRate) {
        const {
          selectedRate: { name, price, rate },
        } = siteObject;
        rateValue = { label: name, price, value: rate };
      }
    }
  }
  return (
    <div className="row row--start row--expand row--gutter">
      <input
        className="col col--start col--expand col--no-gutter-left profiles-rates__input-group--rate"
        required
        disabled
        value={rateValue ? rateValue.value : ''}
        placeholder=""
        data-private
      />
      <input
        className="col col--start col--expand col--no-gutter-left profiles-rates__input-group--price"
        required
        disabled
        value={rateValue ? rateValue.price : ''}
        placeholder=""
        data-private
      />
    </div>
  );
};

RateInputs.propTypes = {
  rates: PropTypes.arrayOf(PropTypes.any).isRequired,
  selectedStore: PropTypes.objectOf(PropTypes.any),
};

RateInputs.defaultProps = {
  selectedStore: null,
};

const mapStateToProps = (state, ownProps) => ({
  selectedStore: ownProps.profile.selectedStore,
  rates: ownProps.profile.rates,
});

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RateInputs);
