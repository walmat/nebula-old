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

import { makeTheme } from '../../app/state/selectors';
import { makeSelectedProfile, makeProfiles } from '../state/selectors';
import { profileActions } from '../../store/actions';
import { buildStyle } from '../../styles';

export class LoadProfilePrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.onProfileChange = this.onProfileChange.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.loadProfile = this.loadProfile.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
  }

  onProfileChange(event) {
    const id = event.value;
    const { profiles, onSelectProfile } = this.props;
    const selectedProfile = profiles.find(p => p.id === id);

    onSelectProfile(selectedProfile);
  }

  loadProfile() {
    const { onLoadProfile, selectedProfile } = this.props;
    onLoadProfile(selectedProfile);
  }

  deleteProfile() {
    const { onDestroyProfile, selectedProfile } = this.props;

    onDestroyProfile(selectedProfile);
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    const opts = [];
    profiles.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName });
    });
    return opts;
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
    const { theme, selectedProfile } = this.props;
    let selectProfileValue = null;
    if (selectedProfile.id !== null) {
      selectProfileValue = {
        value: selectedProfile.id,
        label: selectedProfile.profileName,
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
                          options={this.buildProfileOptions()}
                          data-private
                        />
                      </div>
                    </div>
                    <div className="row row--gutter row--end row--expand">
                      {LoadProfilePrimitive.renderButton('delete', this.deleteProfile, 'Delete')}
                      {LoadProfilePrimitive.renderButton('load', this.loadProfile, 'Load')}
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
  selectedProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  // funcs...
  onLoadProfile: PropTypes.func.isRequired,
  onSelectProfile: PropTypes.func.isRequired,
  onDestroyProfile: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  profiles: makeProfiles(state),
  selectedProfile: makeSelectedProfile(state),
});

export const mapDispatchToProps = dispatch => ({
  onLoadProfile: profile => {
    dispatch(profileActions.load(profile));
  },
  onSelectProfile: profile => {
    dispatch(profileActions.select(profile));
  },
  onDestroyProfile: profile => {
    dispatch(profileActions.remove(profile.id));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LoadProfilePrimitive);
