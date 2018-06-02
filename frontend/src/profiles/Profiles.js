import React, { Component } from 'react';
import PaymentFields from './PaymentFields';
import LocationFields from './LocationFields';
import validationStatus from '../utils/validationStatus';
import './Profiles.css';

import { dispatch } from 'react-redux';
import { editProfile } from '../state/actions/profiles/ProfileActions';

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
        this.state = {
            errors: {},
            shippingMatchesBilling: false,
            profiles: [],
            selectedProfile: {},
            currentProfile: {
                profileName: '',
                shipping: {
                    firstName: '',
                    lastName: '',
                    address: '',
                    apt: '',
                    city: '',
                    country: 'United States',
                    state: '',
                    zipCode: '',
                    phone: ''
                },
                billing: {
                    firstName: '',
                    lastName: '',
                    address: '',
                    apt: '',
                    city: '',
                    country: 'United States',
                    state: '',
                    zipCode: '',
                    phone: ''
                },
                payment: {
                    email: '',
                    cardNumber: '',
                    exp: '',
                    cvv: ''
                }
            },
            test: {

            }
        };

        this.saveProfile = this.saveProfile.bind(this);
    }

    componentDidMount = async () => {
        /*FETCH THE PROFILES FROM THE DATABASE*/
        let result = await fetch(`http://localhost:8080/profiles/${process.env.REACT_APP_REGISTRATION_KEY}`,
        {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        let profiles = (await result.json()).profiles;
        this.setState({profiles});
    }

    /**
     * store the profile in the database for the user
     * @param e
     */
    saveProfile = async (e) => {
        // saves input data to user's profiles
        e.preventDefault();

        let profile = this.state.currentProfile;
        if (this.state.shippingMatchesBilling) {
            profile.billing = profile.shipping;
        }

        profile.registrationKey = process.env.REACT_APP_REGISTRATION_KEY; //TODO this is only temporary until we get registration key stuff implemented

        /*Store the profile in the db*/
        try {
            let response = await fetch('http://localhost:8080/profiles',
            {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.state.currentProfile)
            });

            let result = await response.json();
            if (!result.ok) {
                this.setState({
                    errors: result.errors || {}
                });
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * load the profile
     */
    loadProfile = () => {
        let selectedProfile = this.state.selectedProfile;
        let currentProfile = Object.assign({}, selectedProfile);
        this.setState({currentProfile});
    }

    /**
     * sets the billing fields to disabled if the 'matched' checkbox is checked
     *
     *
     */
    setDisabled = () => {
        let shippingMatchesBilling = !this.state.shippingMatchesBilling;
        this.setState({shippingMatchesBilling});
    }

    createLocationFieldsChange(type) {
      return (changes) => {
        console.log(`editProfile: current, ${type}, ${changes}`);
        // dispatch(editProfile(0, type, changes.value, changes.field));
      }
    }

    onShippingFieldsChange = (shipping, fieldChanged) => {
        delete this.state.errors[`/shipping/${fieldChanged}`];
        let currentProfile = this.state.currentProfile;
        currentProfile.shipping = shipping;
        this.setState(currentProfile);
    };

    onBillingFieldsChange = (billing, fieldChanged) => {
        delete this.state.errors[`/billing/${fieldChanged}`];
        let currentProfile = this.state.currentProfile;
        currentProfile.billing = billing;
        this.setState(currentProfile);
    };

    onProfileNameChange = (event) => {
        let currentProfile = this.state.currentProfile;
        currentProfile.profileName = event.target.value;
        this.setState(currentProfile);
    }

    onProfileChange = (event) => {
        const profileName = event.target.value;
        let profiles = this.state.profiles;
        let selectedProfile = profiles.find((profile) => {
            return profile.profileName === profileName;
        });

        this.setState({selectedProfile});
    }

    onPaymentFieldsChange = (payment, fieldChanged) => {
        delete this.state.errors[`/payment/${fieldChanged}`];
        let currentProfile = this.state.currentProfile;
        currentProfile.payment = payment;
        this.setState(currentProfile);
    };

    buildRealtiveErrors = (basePath) => {
        const errors = this.state.errors;
        let relativeErrors = {};
        if(errors) {
            Object.keys(errors).forEach((path) => {
                if (path.startsWith(basePath)) {
                    relativeErrors[path.replace(basePath, '')] = errors[path];
                }
            });
        }
        return relativeErrors;
    }

    buildProfileOptions = () => {
        let profiles = this.state.profiles;
        return profiles && profiles.map((profile) => {
            return <option key={profile.profileName}>{profile.profileName}</option>;
        });
    }

    componentDidUpdate = () => {
        console.log('UPDATE')
    }

    render() {
        const currentProfile = this.state.currentProfile;
        return (
            <form>
                <div className="container">
                    {/*HEADER*/}
                    <h1 className="text-header" id="profiles-header">Profiles</h1>

                    {/*LOAD PROFILE*/}
                    <p className="body-text" id="load-profile-label">Load Profile</p>
                    <div id="load-profile-box" />
                    <p id="profile-name-label">Profile Name</p>
                    <select id="profile-load" onChange={this.onProfileChange} value={this.state.selectedProfile.profileName || ''}>
                        <option value=""  hidden>{'Choose Profile to Load'}</option>
                        {this.buildProfileOptions()}
                    </select>
                    <img src={DDD} id="profile-select-arrow" />
                    <button id="load-profile" type='button' onClick={this.loadProfile}>Load</button>

                    {/*SHIPPING INFORMATION*/}
                    <div className="flex-col">
				        <p className="body-text" id="shipping-label">Shipping</p>
                        <LocationFields onChange={this.onShippingFieldsChange} value={currentProfile.shipping} errors={this.buildRealtiveErrors('/shipping')} disabled={false} id={'shipping'}/>
                    </div>

                    {/*BILLING MATCHES SHIPPING*/}
                    <img src={this.state.shippingMatchesBilling ? checkboxChecked : checkboxUnchecked} id="billing-match-shipping" onClick={this.setDisabled}/>

                    {/*BILLING INFORMATION*/}
                    <div className="flex-col">
                        <p className="body-text" id="billing-label">Billing</p>
                        <LocationFields onChange={this.onBillingFieldsChange} value={currentProfile.billing} errors={this.buildRealtiveErrors('/billing')} disabled={this.state.shippingMatchesBilling} id={'billing'}/>
                    </div>

                    {/*PAYMENT INFORMATION*/}
                    <PaymentFields onChange={this.onPaymentFieldsChange} value={currentProfile.payment} errors={this.buildRealtiveErrors('/payment')}/>

                    {/*SAVE PROFILE*/}
                    <input id="profile-save" onChange={this.onProfileNameChange} value={currentProfile.profileName} style={validationStatus(this.state.errors['/profileName'])} placeholder="Profile Name"/>
                    <button id="submit-profile" onClick={this.saveProfile}>Save</button>
                </div>
            </form>
        );
    }
}

export default Profiles;
