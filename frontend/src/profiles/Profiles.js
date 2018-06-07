import React, { Component } from 'react';
import PaymentFields from './PaymentFields';
import LocationFields from './LocationFields';
import validationStatus from '../utils/validationStatus';
import './Profiles.css';

import { connect } from 'react-redux';
import { profileActions, PROFILE_FIELDS } from '../state/Actions';

// images
import DDD from '../_assets/dropdown-down.svg';
import checkboxUnchecked from '../_assets/Check_icons-02.svg';
import checkboxChecked from '../_assets/Check_icons-01.svg';
import DDU from '../_assets/dropdown-up.svg';

// TODO Need way to display that the server 'blew up'
// TODO Reload profiles when new profile saved
// TODO Loading when getting profiles

class Profiles extends Component {

    constructor(props) {
        super(props);
    }

    componentDidMount = async () => {
        /* TODO: FETCH THE PROFILES FROM THE DATABASE */
        // THIS WILL HAPPEN IN AN ACTION VIA MIDDLEWARE

        // let result = await fetch(`http://localhost:8080/profiles/${process.env.REACT_APP_REGISTRATION_KEY}`,
        // {
        //     method: "GET",
        //     headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json'
        //     }
        // });
        // let profiles = (await result.json()).profiles;
        // this.setState({profiles});
    }

    /**
     * store the profile in the database for the user
     * @param e
     */
    saveProfile = async (e) => {
        // saves input data to user's profiles
        e.preventDefault();

        // Check if current profile has an editId associated with it
        if (this.props.currentProfile.editId !== undefined) {
            // make sure the profile id exists in profiles before call in the load
            if (this.props.profiles.some(p => p.id === this.props.currentProfile.editId)) {
                // The current profile has the same id as a profile in the profiles list, update that profile
                this.props.onUpdateProfile(this.props.currentProfile);
            } else {
                // The current profile has an edit id, but it doesn't match any on the profiles list, add this as a new profile.
                this.props.onAddNewProfile(this.props.currentProfile);
            }
        } else {
            // No edit id tag exists, add this as a new profile.
            this.props.onAddNewProfile(this.props.currentProfile);
        }

        // let profile = this.props.currentProfile;
        // if (this.props.shippingMatchesBilling) {
        //     profile.billing = profile.shipping;
        // }


        // TODO: Move this into a middleware the does this when a PROFILE_ACTION.ADD action is detected!
        // profile.registrationKey = process.env.REACT_APP_REGISTRATION_KEY; //TODO this is only temporary until we get registration key stuff implemented

        /*Store the profile in the db*/
        // try {
        //     let response = await fetch('http://localhost:8080/profiles',
        //     {
        //         method: "POST",
        //         headers: {
        //             'Accept': 'application/json',
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify(this.state.currentProfile)
        //     });

        //     let result = await response.json();
        //     if (!result.ok) {
        //         this.setState({
        //             errors: result.errors || {}
        //         });
        //     }
        // } catch (err) {
        //     console.log(err);
        // }
    }

    /**
     * load the profile
     */
    loadProfile = () => {
        this.props.onLoadProfile(this.props.selectedProfile);
    }

    /**
     * Delete the profile from the database
     */
    deleteProfile = () => {
        this.props.onDestroyProfile(this.props.selectedProfile);
    }

    onProfileChange = (event) => {
        const profileName = event.target.value;
        let profiles = this.props.profiles;
        let selectedProfile = profiles.find((profile) => {
            return profile.profileName === profileName;
        });

        this.props.onSelectProfile(selectedProfile);
    }

    buildProfileOptions = () => {
        let profiles = this.props.profiles;
        return profiles && profiles.map((profile) => {
            return <option key={profile.id}>{profile.profileName}</option>;
        });
    }

    componentDidUpdate = () => {
        console.log('UPDATE')
    }

    render() {
        return (
            <form>
                <div className="container">
                    {/*HEADER*/}
                    <h1 className="text-header" id="profiles-header">Profiles</h1>

                    {/*LOAD PROFILE*/}
                    <p className="body-text" id="load-profile-label">Load Profile</p>
                    <div id="load-profile-box" />
                    <p id="profile-name-label">Profile Name</p>
                    <select id="profile-load" onChange={this.onProfileChange} value={this.props.selectedProfile.profileName || ''}>
                        <option value=""  hidden>{'Choose Profile to Load'}</option>
                        {this.buildProfileOptions()}
                    </select>
                    <img src={DDD} id="profile-select-arrow" />
                    <button id="load-profile" type='button' onClick={this.loadProfile}>Load</button>

                    {/*SHIPPING INFORMATION*/}
                    <div className="flex-col">
                        <p className="body-text" id="shipping-label">Shipping</p>
                        <LocationFields id={'shipping'} profileToEdit={this.props.currentProfile} fieldToEdit={PROFILE_FIELDS.EDIT_SHIPPING} disabled={false} />
                    </div>

                    {/*BILLING MATCHES SHIPPING*/}
                    <img src={this.props.currentProfile.billingMatchesShipping ? checkboxChecked : checkboxUnchecked} id="billing-match-shipping" onClick={this.props.onClickBillingMatchesShipping} draggable="false"/>

                    {/*BILLING INFORMATION*/}
                    <div className="flex-col">
                        <p className="body-text" id="billing-label">Billing</p>
                        <LocationFields id={'billing'} profileToEdit={this.props.currentProfile} fieldToEdit={this.props.currentProfile.billingMatchesShipping ? PROFILE_FIELDS.EDIT_SHIPPING : PROFILE_FIELDS.EDIT_BILLING} disabled={this.props.currentProfile.billingMatchesShipping} />
                    </div>

                    {/*PAYMENT INFORMATION*/}
                    <PaymentFields profileToEdit={this.props.currentProfile} />

                    {/*SAVE PROFILE*/}
                    <input id="profile-save" required onChange={this.props.onProfileNameChange} value={this.props.currentProfile.profileName} style={validationStatus(this.props.currentProfile.errors[PROFILE_FIELDS.EDIT_NAME])} placeholder="Profile Name"/>
                    <button id="submit-profile" onClick={this.saveProfile}>Save</button>

                    {/*DELETE PROFILE*/}
                    <button id="delete-profile" onClick={this.deleteProfile}>Delete</button>
                </div>
            </form>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        profiles: state.profiles,
        currentProfile: state.currentProfile,
        selectedProfile: state.selectedProfile,
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
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
            dispatch(profileActions.remove(profile));
        },
        onSelectProfile: (profile) => {
            dispatch(profileActions.select(profile));
        },
        onUpdateProfile: (profile) => {
            dispatch(profileActions.update(profile.editId, profile));
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Profiles);