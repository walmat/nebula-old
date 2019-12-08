import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const RateInputs = ({ selectedSite, rates }) => {
  let rateValue = null;

  let siteObject = [];
  if (selectedSite) {
    siteObject = rates.find(v => v.site.url === selectedSite.value);
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
  selectedSite: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  selectedSite: ownProps.profile.selectedSite,
  rates: ownProps.profile.rates,
});

export const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RateInputs);
