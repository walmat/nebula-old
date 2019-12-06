import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Select from 'react-select';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../styles/components/select';

import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../../../store/actions';
import { buildStyle } from '../../../styles';

import { isProvinceDisabled } from '../../../constants/profiles';
import { buildProvinceOptions } from '../../../constants/selects';
import { makeTheme } from '../../../app/state/selectors';

const CityStateFields = ({ id, theme, value, disabled, onChange }) => (
  <div className="row row--start row--expand row--gutter">
    <div
      className="col col--start col--expand col--no-gutter"
      style={{ flexGrow: 1, flexBasis: 0 }}
    >
      <input
        className={`${id}-profiles-location__input-group--city`}
        required
        placeholder="City"
        onChange={e => onChange({ field: LOCATION_FIELDS.CITY, value: e.target.value })}
        value={value.city}
        style={buildStyle(disabled, null)}
        disabled={disabled}
        data-private
      />
    </div>
    <div className="col col--expand col--no-gutter-left" style={{ flexGrow: 2 }}>
      <Select
        required
        placeholder="Province"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        className={`${id}-profiles-location__input-group--province`}
        classNamePrefix="select"
        options={buildProvinceOptions(value.country, disabled)}
        onChange={e =>
          onChange({
            field: LOCATION_FIELDS.PROVINCE,
            value: {
              province: e,
              country: value.country,
            },
          })
        }
        value={value.province}
        styles={colourStyles(theme, buildStyle(disabled, null))}
        isDisabled={isProvinceDisabled(value.country, disabled)}
        data-private
      />
    </div>
  </div>
);

CityStateFields.propTypes = {
  id: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  theme: makeTheme(state),
  field: ownProps.field,
  value: ownProps.profile[mapProfileFieldToKey[ownProps.field]],
  disabled: ownProps.disabled,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(ownProps.profile.id, ownProps.field, changes.value, changes.field),
    );
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CityStateFields);
