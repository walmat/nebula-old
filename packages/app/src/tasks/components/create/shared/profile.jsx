import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeProfiles } from '../../../../profiles/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../../styles/components/select';

import { buildProfileOptions } from '../../../../constants/selects';
import { buildStyle } from '../../../../styles';

const onChange = (event, onSelect) => {
  if (!event) {
    return onSelect(event);
  }
  return onSelect(event.value);
};

const ProfileSelect = ({ theme, profile, profiles, onSelect }) => {
  let profileValue = null;
  if (profile) {
    profileValue = {
      value: profile.id,
      label: profile.name,
    };
  }

  return (
    <div className="col col--expand col--no-gutter" style={{ flexGrow: 5 }}>
      <p className="tasks--create__label">Billing Profile</p>
      <Select
        required
        className="tasks--create__input tasks--create__input--field"
        classNamePrefix="select"
        placeholder="Choose Profile"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        styles={colourStyles(theme, buildStyle(false, null))}
        onChange={e => onChange(e, onSelect)}
        value={profileValue}
        options={buildProfileOptions(profiles)}
        data-private
      />
    </div>
  );
};

ProfileSelect.propTypes = {
  onSelect: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  profile: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
};

export const mapStateToProps = state => ({
  profiles: makeProfiles(state),
  profile: makeCurrentTask(state).profile,
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_PROFILE, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfileSelect);
