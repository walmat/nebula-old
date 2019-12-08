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
  const siteOptions = rates.map(({ site: { url, name } }) => ({ value: url, label: name }));

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
      value={selectedSite}
      options={siteOptions}
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
      profileActions.edit(
        ownProps.profile.id,
        PROFILE_FIELDS.EDIT_SELECTED_SITE,
        value,
        RATES_FIELDS.SITE,
      ),
    );
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SiteSelect);
