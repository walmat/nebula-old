import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import PaymentFields from './components/paymentFields';
import ShippingRateFields from './components/shippingRates';
import LocationFields from './components/locationFields';
import LoadProfile from './components/loadProfile';
import validationStatus from '../utils/validationStatus';
import defns from '../state/definitions/profileDefinitions';

import { profileActions, mapProfileFieldToKey, PROFILE_FIELDS } from '../state/actions';

import '../styles/index.scss';
import './styles/index.scss';

export class ProfilesPrimitive extends Component {
  constructor(props) {
    super(props);
    this.saveProfile = this.saveProfile.bind(this);
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

  render() {
    const { currentProfile, onProfileNameChange } = this.props;
    const shippingRateFields = currentProfile.editId ? (
      <ShippingRateFields profileToEdit={currentProfile} />
    ) : null;
    return (
      <div className="container profiles">
        <div className="row row--start row--expand" style={{ width: '100%' }}>
          <div className="col col--start">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <h1 className="text-header profiles__title">Profiles</h1>
              </div>
            </div>
            <LoadProfile />
          </div>
        </div>
        <div className="row row--start row--expand" style={{ width: '100%' }}>
          <LocationFields
            header="Shipping"
            id="shipping"
            className="col col--start col--expand"
            profileToEdit={currentProfile}
            fieldToEdit={PROFILE_FIELDS.EDIT_SHIPPING}
            disabled={false}
          />
          <LocationFields
            header="Billing"
            id="billing"
            className="col col--start col--expand"
            profileToEdit={currentProfile}
            fieldToEdit={
              currentProfile.billingMatchesShipping
                ? PROFILE_FIELDS.EDIT_SHIPPING
                : PROFILE_FIELDS.EDIT_BILLING
            }
            disabled={currentProfile.billingMatchesShipping}
          />
          <div className="col col--start col--expand">
            <div className="row row--start">
              <PaymentFields className="profiles__fields--payment" profileToEdit={currentProfile} />
            </div>
            <div className="row row--start">{shippingRateFields}</div>
          </div>
        </div>
        <div
          className="row row--expand row--end row--gutter profiles--save-row"
          style={{ width: '100%' }}
        >
          <div className="col col--end col--no-gutter-left">
            <div className="row row--extend row--end row--gutter">
              <input
                className="profiles__fields--name"
                required
                onChange={onProfileNameChange}
                value={currentProfile.profileName}
                style={validationStatus(
                  currentProfile.errors[mapProfileFieldToKey[PROFILE_FIELDS.EDIT_NAME]],
                )}
                placeholder="Profile Name"
                data-private
              />
            </div>
          </div>
          <div className="col col--end col--gutter">
            <div className="row row--extend row--end row--no-gutter">
              <button type="button" className="profiles__fields--save" onClick={this.saveProfile}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ProfilesPrimitive.propTypes = {
  profiles: defns.profileList.isRequired,
  currentProfile: defns.profile.isRequired,
  onProfileNameChange: PropTypes.func.isRequired,
  onAddNewProfile: PropTypes.func.isRequired,
  onUpdateProfile: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  currentProfile: state.currentProfile,
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
  onUpdateProfile: profile => {
    dispatch(profileActions.update(profile.editId, profile));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfilesPrimitive);
