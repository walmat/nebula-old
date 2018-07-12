import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import PaymentFields from './paymentFields';
import LocationFields from './locationFields';
import validationStatus from '../utils/validationStatus';
import './profiles.css';

import { profileActions, mapProfileFieldToKey, PROFILE_FIELDS } from '../state/actions';

// images
import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import checkboxUnchecked from '../_assets/Check_icons-02.svg';
import checkboxChecked from '../_assets/Check_icons-01.svg';
// import DDU from '../_assets/dropdown-up.svg';

// TODO Need way to display that the server 'blew up'
// TODO Reload profiles when new profile saved
// TODO Loading when getting profiles

class Profiles extends Component {
  constructor(props) {
    super(props);
    this.onProfileChange = this.onProfileChange.bind(this);
    this.saveProfile = this.saveProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.loadProfile = this.loadProfile.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
  }

  async componentDidMount() {
    // this.props.history.push('/login');
    // THIS WILL BE HANDLED IN A MIDDLEWARE
    /* FETCH THE PROFILES FROM THE API */
    // let result = await fetch(`http://localhost:8080/profiles/${process.env.REACT_APP_REGISTRATION_KEY}`,
    //     {
    //         method: "GET",
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json'
    //         }
    //     });
    // let profiles = (await result.json()).profiles;
    // this.setState({profiles});
  }

  componentDidUpdate() {
    console.log('UPDATE');
  }

  onProfileChange(event) {
    const profileName = event.target.value;
    const { profiles } = this.props;
    const selectedProfile = profiles.find(p => p.profileName === profileName);

    this.props.onSelectProfile(selectedProfile);
  }

  /**
   * Delete the profile from the database
   */
  deleteProfile(e) {
    e.preventDefault();
    this.props.onDestroyProfile(this.props.selectedProfile);
  }

  /**
   * store the profile in the database for the user
   * @param e
   */
  async saveProfile(e) {
    // saves input data to user's profiles
    e.preventDefault();

    // first off, check to see if the profileName is taken..
    if (this.props.profiles.some(p => {
      // update that profile instead
      if (p.profileName === this.props.currentProfile.profileName) {
        this.props.onUpdateProfile(p);
      }
    }));

    // Check if current profile has an editId associated with it
    if (this.props.currentProfile.editId !== undefined) {
      // make sure the profile id exists in profiles before call in the load
      this.props.profiles.some(p => {
        // if profile being edited matches the current profile loaded
        if (p.id === this.props.currentProfile.editId) {
          // check to see if they changed the profileName and save it as a new profile
          if (p.profileName !== this.props.currentProfile.profileName) {
            this.props.onAddNewProfile(this.props.currentProfile);
          } else {
            // otherwise update the current profile
            this.props.onUpdateProfile(this.props.currentProfile);
          }
        } else {
          // if no profile is found with that given editId, must be a new one
          this.props.onAddNewProfile(this.props.currentProfile);
        }
      });
    } else {
      // No edit id tag exists, add this as a new profile.
      this.props.onAddNewProfile(this.props.currentProfile);
    }
  }

  /**
   * load the profile
   */
  loadProfile() {
    this.props.onLoadProfile(this.props.selectedProfile);
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    return profiles && profiles.map(profile =>
      (<option key={profile.id} > {profile.profileName} </option>));
  }

  render() {
    const { currentProfile } = this.props;
    return (
      <form>
        <div className="container">
          {/* HEADER */}
          <h1 className="text-header" id="profiles-header">Profiles</h1>

          {/* LOAD PROFILE */}
          <p className="body-text" id="load-profile-label">Load Profile</p>
          <div id="load-profile-box" />
          <p id="profile-name-label">Profile Name</p>
          <select id="profile-load" onChange={this.onProfileChange} value={this.props.selectedProfile.profileName || ''}>
            <option value="" hidden>Choose Profile to Load</option>
            {this.buildProfileOptions()}
          </select>
          <img
            src={currentProfile ? DDD : DDU}
            alt="dropdown arrow"
            id="profile-select-arrow"
            draggable="false"
          />
          <button id="load-profile" type="button" onClick={this.loadProfile}>Load</button>

          {/* SHIPPING INFORMATION */}
          <div className="flex-col">
            <p className="body-text" id="shipping-label">Shipping</p>
            <LocationFields id="shipping" profileToEdit={currentProfile} fieldToEdit={PROFILE_FIELDS.EDIT_SHIPPING} disabled={false} />
          </div>

          {/* BILLING MATCHES SHIPPING */}
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.props.onClickBillingMatchesShipping}>
            <img
              src={currentProfile.billingMatchesShipping ? checkboxChecked : checkboxUnchecked}
              alt="billing matches shipping checkbox"
              id="billing-match-shipping"
              draggable="false"
            />
          </div>

          {/* BILLING INFORMATION */}
          <div className="flex-col">
            <p className="body-text" id="billing-label">Billing</p>
            <LocationFields
              id="billing"
              profileToEdit={currentProfile}
              fieldToEdit={
                currentProfile.billingMatchesShipping ?
                  PROFILE_FIELDS.EDIT_SHIPPING :
                  PROFILE_FIELDS.EDIT_BILLING
              }
              disabled={currentProfile.billingMatchesShipping}
            />
          </div>

          {/* PAYMENT INFORMATION */}
          <PaymentFields profileToEdit={currentProfile} />

          {/* SAVE PROFILE */}
          <input
            id="profile-save"
            required
            onChange={this.props.onProfileNameChange}
            value={currentProfile.profileName}
            style={validationStatus(currentProfile
                .errors[mapProfileFieldToKey[PROFILE_FIELDS.EDIT_NAME]])}
            placeholder="Profile Name"
          />
          <button id="submit-profile" onClick={this.saveProfile}>Save</button>

          {/* DELETE PROFILE */}
          <button id="delete-profile" onClick={this.deleteProfile}>Delete</button>
        </div>
      </form>
    );
  }
}

Profiles.propTypes = {
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  selectedProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  onClickBillingMatchesShipping: PropTypes.func.isRequired,
  onProfileNameChange: PropTypes.func.isRequired,
  onAddNewProfile: PropTypes.func.isRequired,
  onLoadProfile: PropTypes.func.isRequired,
  onDestroyProfile: PropTypes.func.isRequired,
  onSelectProfile: PropTypes.func.isRequired,
  onUpdateProfile: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
  profiles: state.profiles,
  currentProfile: state.currentProfile,
  selectedProfile: state.selectedProfile,
});

const mapDispatchToProps = dispatch => ({
  onClickBillingMatchesShipping: () => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING));
  },
  onProfileNameChange: (event) => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.EDIT_NAME, event.target.value));
  },
  onAddNewProfile: (newProfile) => {
    dispatch(profileActions.add(newProfile));
  },
  onLoadProfile: (profile) => {
    dispatch(profileActions.load(profile));
  },
  onDestroyProfile: (profile) => {
    dispatch(profileActions.remove(profile.id));
  },
  onSelectProfile: (profile) => {
    dispatch(profileActions.select(profile));
  },
  onUpdateProfile: (profile) => {
    dispatch(profileActions.update(profile.editId, profile));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Profiles));
