import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import {
  DropdownIndicator,
  IndicatorSeparator,
  colourStyles,
} from '../../../styles/components/select';

import { makeTheme } from '../../../app/state/selectors';
import { RATES_FIELDS, profileActions, PROFILE_FIELDS } from '../../../store/actions';

const RateSelect = ({ theme, onChange, selectedStore, rates }) => {
  let rateValue = null;
  let siteObject = [];
  let nameOptions = [];

  if (selectedStore) {
    siteObject = rates.find(v => v.store.url === selectedStore.value);
    if (siteObject) {
      if (siteObject.selectedRate) {
        const {
          selectedRate: { name, price, rate },
        } = siteObject;
        rateValue = { label: name, price, value: rate };
      }
      nameOptions = siteObject.rates.map(({ rate, price, name }) => ({
        value: rate,
        price,
        label: name,
      }));
    }
  }

  return (
    <Select
      required
      placeholder="Choose Rate"
      components={{ DropdownIndicator, IndicatorSeparator }}
      isMulti={false}
      isClearable={false}
      className="col col--start col--expand profiles-rates__input-group--name"
      classNamePrefix="select"
      styles={colourStyles(theme)}
      onChange={e =>
        onChange({ store: selectedStore, rate: { name: e.label, price: e.price, rate: e.value } })
      }
      value={rateValue}
      options={nameOptions}
      data-private
    />
  );
};

RateSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  rates: PropTypes.arrayOf(PropTypes.any).isRequired,
  selectedStore: PropTypes.objectOf(PropTypes.any),
  onChange: PropTypes.func.isRequired,
};

RateSelect.defaultProps = {
  selectedStore: null,
};

const mapStateToProps = (state, ownProps) => ({
  theme: makeTheme(state),
  rates: ownProps.profile.rates,
  selectedStore: ownProps.profile.selectedStore,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: value => {
    dispatch(
      profileActions.edit(ownProps.profile.id, PROFILE_FIELDS.EDIT_RATES, value, RATES_FIELDS.RATE),
    );
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RateSelect);
