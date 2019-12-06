import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';

import { buildProfileOptions } from '../../constants/selects';
import { makeTheme } from '../../app/state/selectors';
import { makeCurrentProfile, makeProfiles } from '../state/selectors';
import { profileActions } from '../../store/actions';
import { buildStyle } from '../../styles';

export class LoadProfilePrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.onProfileChange = this.onProfileChange.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
  }

  onProfileChange(event) {
    const id = event.value;
    const { profiles, onSelectProfile } = this.props;
    const currentProfile = profiles.find(p => p.id === id);

    onSelectProfile(currentProfile);
  }

  deleteProfile() {
    const { onDestroyProfile, currentProfile } = this.props;

    onDestroyProfile(currentProfile);
  }

  static renderButton(className, onClick, label) {
    return (
      <button
        type="button"
        className={`profiles-load__input-group--${className}`}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  render() {
    const { theme, profiles, currentProfile } = this.props;

    let selectProfileValue = null;
    if (currentProfile.id !== null) {
      selectProfileValue = {
        value: currentProfile.id,
        label: currentProfile.name,
      };
    }
    return (
      <div className="row row--expand row--no-gutter-left">
        <div className="col col--expand col--start">
          <div className="row row--start">
            <div className="col col--no-gutter-left">
              <p className="body-text section-header profiles-load__section-header">Load Profile</p>
            </div>
          </div>
          <div className="row row--start">
            <div className="col col--no-gutter">
              <div className="profiles-load col col--start col--no-gutter">
                <div className="row row--start row--gutter">
                  <div className="col profiles-load__input-group">
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
                          onChange={this.onProfileChange}
                          value={selectProfileValue}
                          options={buildProfileOptions(profiles)}
                          data-private
                        />
                      </div>
                    </div>
                    <div className="row row--gutter row--end row--expand">
                      {LoadProfilePrimitive.renderButton('delete', this.deleteProfile, 'Delete')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

LoadProfilePrimitive.propTypes = {
  // props...
  theme: PropTypes.string.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  // funcs...
  onLoadProfile: PropTypes.func.isRequired,
  onSelectProfile: PropTypes.func.isRequired,
  onDestroyProfile: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  profiles: makeProfiles(state),
  currentProfile: makeCurrentProfile(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelectProfile: profile => {
    dispatch(profileActions.select(profile));
  },
  onDestroyProfile: profile => {
    console.log(profile);
    dispatch(profileActions.remove(profile.id));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LoadProfilePrimitive);