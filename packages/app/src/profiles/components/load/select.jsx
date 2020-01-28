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

import { makeTheme } from '../../../app/state/selectors';
import { makeCurrentProfile, makeProfiles } from '../../state/selectors';
import { profileActions } from '../../../store/actions';
import { buildProfileOptions } from '../../../constants';
import { buildStyle } from '../../../styles';

const onChange = (e, profiles, onSelect) => {
  const id = e.value;
  const currentProfile = profiles.find(p => p.id === id);

  onSelect(currentProfile);
};

const ProfileSelect = ({ theme, currentProfile, profiles, onSelect }) => {
  let selectProfileValue = null;
  if (currentProfile.id !== null) {
    selectProfileValue = {
      value: currentProfile.id,
      label: currentProfile.name,
    };
  }
  return (
    <div className="row row--gutter">
      <div className="col col--no-gutter">
        <p className="profiles-load__label">Profile Name</p>
        <Select
          required
          placeholder="Load Profile"
          components={{
            DropdownIndicator,
            IndicatorSeparator,
            Control,
            Option,
            Menu,
            MenuList,
          }}
          className="profiles-load__input-group--select"
          classNamePrefix="select"
          styles={colourStyles(theme, buildStyle(false, null))}
          onChange={e => onChange(e, profiles, onSelect)}
          value={selectProfileValue}
          options={buildProfileOptions(profiles)}
          data-private
        />
      </div>
    </div>
  );
};

ProfileSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  theme: makeTheme(state),
  profiles: makeProfiles(state),
  currentProfile: makeCurrentProfile(state),
});

const mapDispatchToProps = dispatch => ({
  onSelect: profile => dispatch(profileActions.select(profile)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProfileSelect);
