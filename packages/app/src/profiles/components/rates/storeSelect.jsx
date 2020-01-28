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

const StoreSelect = ({ theme, onChange, selectedStore, rates }) => {
  const siteOptions = rates.map(({ store: { url, name } }) => ({ value: url, label: name }));

  return (
    <Select
      required
      placeholder="Choose Site"
      components={{ DropdownIndicator, IndicatorSeparator }}
      isMulti={false}
      isClearable={false}
      className="col col--start col--expand col--no-gutter profiles-rates__input-group--site"
      classNamePrefix="select"
      styles={colourStyles(theme)}
      onChange={e => onChange(e)}
      value={selectedStore}
      options={siteOptions}
      data-private
    />
  );
};

StoreSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rates: PropTypes.arrayOf(PropTypes.any).isRequired,
  selectedStore: PropTypes.objectOf(PropTypes.any),
};

StoreSelect.defaultProps = {
  selectedStore: null,
};

const mapStateToProps = (state, ownProps) => ({
  selectedStore: ownProps.profile.selectedStore,
  theme: makeTheme(state),
  rates: ownProps.profile.rates,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: value => {
    dispatch(
      profileActions.edit(
        ownProps.profile.id,
        PROFILE_FIELDS.EDIT_SELECTED_STORE,
        value,
        RATES_FIELDS.SITE,
      ),
    );
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreSelect);
