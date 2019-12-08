import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import {
  DropdownIndicator,
  IndicatorSeparator,
  colourStyles,
} from '../../../styles/components/select';

import { RATES_FIELDS, profileActions, PROFILE_FIELDS } from '../../../store/actions';

const SiteSelect = ({ theme, onChange, selectedSite, rates }) => {
  let rateValue = null;
  let siteObject = [];
  let nameOptions = [];
  if (selectedSite) {
    siteObject = rates.find(v => v.site.url === selectedSite.value);
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
        onChange({ site: selectedSite, rate: { name: e.label, price: e.price, rate: e.value } })
      }
      value={rateValue}
      options={nameOptions}
      data-private
    />
  );
};

SiteSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rates: PropTypes.arrayOf(PropTypes.any).isRequired,
  selectedSite: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  selectedSite: ownProps.profile.selectedSite,
  theme: state.App.theme,
  rates: ownProps.profile.rates,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: value => {
    dispatch(
      profileActions.edit(ownProps.profile.id, PROFILE_FIELDS.EDIT_RATES, value, RATES_FIELDS.RATE),
    );
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SiteSelect);
