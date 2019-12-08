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

import { buildProfileOptions } from '../../../constants';

import { makeProfiles } from '../../../profiles/state/selectors';
import { makeTheme } from '../../../app/state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';
import { buildStyle } from '../../../styles';

const onChange = (e, profiles, onSelect) => {
  const id = e.value;
  const currentProfile = profiles.find(p => p.id === id);

  onSelect(currentProfile);
};

const ProfileSelect = ({ placeholder, type, theme, profile, profiles, onSelect }) => {
  let shippingProfileValue = null;
  if (profile && profile.id !== null) {
    shippingProfileValue = {
      value: profile.id,
      label: profile.name,
    };
  }

  return (
    <div className="col col--start col--expand col--gutter">
      <p className="settings--shipping-manager__input-group--label">Profile</p>
      <Select
        required
        placeholder={placeholder}
        components={{ DropdownIndicator, IndicatorSeparator, Control, Option, Menu, MenuList }}
        isMulti={false}
        isClearable={false}
        className={`settings--shipping-manager__input-group--${type}`}
        classNamePrefix="select"
        styles={colourStyles(theme, buildStyle(false, null))}
        onChange={e => onChange(e, profiles, onSelect)}
        value={shippingProfileValue}
        options={buildProfileOptions(profiles)}
        data-private
      />
    </div>
  );
};

ProfileSelect.propTypes = {
  placeholder: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  profile: PropTypes.objectOf(PropTypes.any),
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  onSelect: PropTypes.func.isRequired,
};

ProfileSelect.defaultProps = {
  profile: null,
};

export const mapStateToProps = (state, ownProps) => ({
  profiles: makeProfiles(state),
  profile: state.Shipping.profile,
  theme: makeTheme(state),
  placeholder: ownProps.placeholder,
  type: ownProps.type,
});

export const mapDispatchToProps = dispatch => ({
  onSelect: profile => {
    dispatch(settingsActions.editShipping(SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE, profile));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfileSelect);
