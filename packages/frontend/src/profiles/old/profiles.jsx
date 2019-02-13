import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import PaymentFields from './paymentFields';
import LocationFields from './locationFields';
import validationStatus from '../../utils/validationStatus';
import defns from '../../utils/definitions/profileDefinitions';
import { DropdownIndicator, colourStyles } from '../../utils/styles/select';
import './profiles.css';

import { profileActions, mapProfileFieldToKey, PROFILE_FIELDS } from '../../state/actions';
import { buildStyle } from '../../utils/styles';
// images
import checkboxChecked from '../../_assets/Check_icons-01.svg';
import checkboxUnchecked from '../../_assets/Check_icons-02.svg';

export class ProfilesPrimitive extends Component {
  constructor(props) {
    super(props);
    this.onProfileChange = this.onProfileChange.bind(this);
    this.saveProfile = this.saveProfile.bind(this);
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

  /**
   * Delete the profile from the database
   */
  deleteProfile(e) {
    const { onDestroyProfile, selectedProfile } = this.props;

    e.preventDefault();
    onDestroyProfile(selectedProfile);
  }

  /**
   * store the profile in the database for the user
   * @param e
   */
  async saveProfile(e) {
    const { profiles, currentProfile, onAddNewProfile, onUpdateProfile } = this.props;

    // saves input data to user's profiles
    e.preventDefault();

    if (currentProfile.editId !== undefined) {
      // make sure the profile id exists in profiles before call in the load
      if (profiles.some(p => p.id === currentProfile.editId)) {
        // first off, check to see if the profileName is taken..
        const profileExists = profiles.find(p => p.profileName === currentProfile.profileName);

        if (profileExists) {
          const { id } = profileExists;
          currentProfile.editId = id;
          currentProfile.id = id;
          onUpdateProfile(currentProfile);
        } else {
          // The current profile has the same id as a profile
          // in the profiles list, update that profile
          onAddNewProfile(currentProfile);
        }
      } else {
        // The current profile has an edit id, but it doesn't match
        // any on the profiles list, add this as a new profile.
        onAddNewProfile(currentProfile);
      }
    } else {
      // No edit id tag exists, add this as a new profile.
      onAddNewProfile(currentProfile);
    }
  }

  /**
   * load the profile
   */
  loadProfile() {
    const { onLoadProfile, selectedProfile } = this.props;
    onLoadProfile(selectedProfile);
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    const opts = [];
    profiles.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName });
    });
    return opts;
  }

  render() {
    const {
      currentProfile,
      selectedProfile,
      onProfileNameChange,
      onKeyPress,
      onClickBillingMatchesShipping,
    } = this.props;
    let selectProfileValue = null;
    if (selectedProfile.id !== null) {
      selectProfileValue = {
        value: selectedProfile.id,
        label: selectedProfile.profileName,
      };
    }
    return (
      <form>
        <div className="container">
          {/* HEADER */}
          <h1 className="text-header" id="profiles-header">
            Profiles
          </h1>

          {/* LOAD PROFILE */}
          <p className="body-text" id="load-profile-label">
            Load Profile
          </p>
          <div id="load-profile-box" />
          <p id="profile-name-label">Profile Name</p>
          <Select
            required
            placeholder="Load Profile"
            components={{ DropdownIndicator }}
            id="profile-load"
            classNamePrefix="select"
            styles={colourStyles(buildStyle(false, true))}
            onChange={this.onProfileChange}
            value={selectProfileValue}
            options={this.buildProfileOptions()}
          />
          <button type="button" id="load-profile" onClick={this.loadProfile}>
            Load
          </button>

          {/* SHIPPING INFORMATION */}
          <div className="flex-col">
            <p className="body-text" id="shipping-label">
              Shipping
            </p>
            <LocationFields
              id="shipping"
              profileToEdit={currentProfile}
              fieldToEdit={PROFILE_FIELDS.EDIT_SHIPPING}
              disabled={false}
            />
          </div>

          {/* BILLING MATCHES SHIPPING */}
          <div
            role="button"
            tabIndex={0}
            onKeyPress={onKeyPress}
            onClick={onClickBillingMatchesShipping}
          >
            <img
              src={currentProfile.billingMatchesShipping ? checkboxChecked : checkboxUnchecked}
              alt={
                currentProfile.billingMatchesShipping
                  ? 'Billing Matches Shipping'
                  : 'Billing does not Match Shipping'
              }
              id="billing-match-shipping"
              draggable="false"
            />
          </div>

          {/* BILLING INFORMATION */}
          <div className="flex-col">
            <p className="body-text" id="billing-label">
              Billing
            </p>
            <LocationFields
              id="billing"
              profileToEdit={currentProfile}
              fieldToEdit={
                currentProfile.billingMatchesShipping
                  ? PROFILE_FIELDS.EDIT_SHIPPING
                  : PROFILE_FIELDS.EDIT_BILLING
              }
              disabled={currentProfile.billingMatchesShipping}
            />
          </div>

          {/* PAYMENT INFORMATION */}
          <PaymentFields id="payment" profileToEdit={currentProfile} />

          {/* SAVE PROFILE */}
          <input
            id="profile-save"
            required
            onChange={onProfileNameChange}
            value={currentProfile.profileName}
            style={validationStatus(
              currentProfile.errors[mapProfileFieldToKey[PROFILE_FIELDS.EDIT_NAME]],
            )}
            placeholder="Profile Name"
          />
          <button type="button" id="submit-profile" onClick={this.saveProfile}>
            Save
          </button>

          {/* DELETE PROFILE */}
          <button type="button" id="delete-profile" onClick={this.deleteProfile}>
            Delete
          </button>
        </div>
      </form>
    );
  }
}

ProfilesPrimitive.propTypes = {
  profiles: defns.profileList.isRequired,
  currentProfile: defns.profile.isRequired,
  selectedProfile: defns.profile.isRequired,
  onClickBillingMatchesShipping: PropTypes.func.isRequired,
  onProfileNameChange: PropTypes.func.isRequired,
  onAddNewProfile: PropTypes.func.isRequired,
  onLoadProfile: PropTypes.func.isRequired,
  onDestroyProfile: PropTypes.func.isRequired,
  onSelectProfile: PropTypes.func.isRequired,
  onUpdateProfile: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

ProfilesPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  currentProfile: state.currentProfile,
  selectedProfile: state.selectedProfile,
});

export const mapDispatchToProps = dispatch => ({
  onClickBillingMatchesShipping: () => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING, ''));
  },
  onProfileNameChange: event => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.EDIT_NAME, event.target.value));
  },
  onAddNewProfile: newProfile => {
    dispatch(profileActions.add(newProfile));
  },
  onLoadProfile: profile => {
    dispatch(profileActions.load(profile));
  },
  onDestroyProfile: profile => {
    dispatch(profileActions.remove(profile.id));
  },
  onSelectProfile: profile => {
    dispatch(profileActions.select(profile));
  },
  onUpdateProfile: profile => {
    dispatch(profileActions.update(profile.editId, profile));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfilesPrimitive);
