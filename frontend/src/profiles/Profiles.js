import React, { Component } from 'react';
import ShippingFields from './ShippingFields';
import BillingFields from './BillingFields';
import PaymentFields from './PaymentFields';
import './Profiles.css';

// images
import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';

class Profiles extends Component {

    constructor(props) {
        super(props);
        this.state = {
            errors: {},
            currentProfile: {
                shipping: {
                    firstName: '',
                    lastName: '',
                    address: '',
                    apt: '',
                    city: '',
                    country: '',
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
                    country: '',
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
            }
        };

        this.fillExpiration = this.fillExpiration.bind(this);
        this.saveProfile = this.saveProfile.bind(this);
        this.loadProfile = this.loadProfile.bind(this);
    }

    /**
     * store the profile in the database for the user
     * @param e
     */
    async saveProfile(e) {
        // saves input data to user's profiles
        e.preventDefault();

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
                    errors: result.errors
                });
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * load the profile
     * @param e
     */
    loadProfile(e) {
        // loads profile to screen (editing purposes mainly)
        e.preventDefault();

        /*FETCH THE PROFILE FROM THE DATABASE*/
        fetch('http://localhost:8080/profiles',
            {
                method: "GET",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .then(res => console.log(res));
    }

    exportProfiles() {
        // export the user's profiles to a json file
    }

    importProfiles() {
        // imports a loaded json file into user's profiles
    }

    getAllProfiles() {
        // pulls all profiles in for a given user
    }


    /* HELPER METHODS */

    /* FORM METHODS */
    fillExpiration() {

    }

    /**
     * sets the billing fields to disabled if the 'matched' option is checked
     */
    setDisabled() {
        if (document.getElementById('match').checked) {
            document.getElementById('bCountry').disabled = true,
                document.getElementById('bState').disabled = true;
            document.getElementById('bFirstName').disabled = true,
                document.getElementById('bLastName').disabled = true,
                document.getElementById('bAddress1').disabled = true,
                document.getElementById('bApt').disabled = true,
                document.getElementById('bCity').disabled = true,
                document.getElementById('bZipCode').disabled = true,
                document.getElementById('bPhone').disabled = true;
        } else {
            document.getElementById('bCountry').disabled = false,
                document.getElementById('bState').disabled = false;
            document.getElementById('bFirstName').disabled = false,
                document.getElementById('bLastName').disabled = false,
                document.getElementById('bAddress1').disabled = false,
                document.getElementById('bApt').disabled = false,
                document.getElementById('bCity').disabled = false,
                document.getElementById('bZipCode').disabled = false,
                document.getElementById('bPhone').disabled = false;
        }
    }

    onShippingFieldsChange = (shipping) => {
        let currentProfile = this.state.currentProfile;
        currentProfile.shipping = shipping;
        this.setState(currentProfile);
    };

    onBillingFieldsChange = (billing) => {
        let currentProfile = this.state.currentProfile;
        currentProfile.billing = billing;
        this.setState(currentProfile);
    };

    onPaymentFieldsChange = (payment) => {
        let currentProfile = this.state.currentProfile;
        currentProfile.payment = payment;
        this.setState(currentProfile);
    };

    render() {
        const errors = this.state.errors;
        return (
            <form>
                <div className="container">
                    {/*HEADER*/}
                    <h1 className="text-header" id="profiles-header">Profiles</h1>

                    {/*LOAD PROFILE*/}
                    <p className="body-text" id="load-profile-label">Load Profile</p>
                    <div id="load-profile-box" />
                    <p id="profile-name-label">Profile Name</p>
                    <select id="profile-load">
                        <option>Profile 1</option>
                    </select>
                    <img src={DDD} id="profile-select-arrow" />
                    <button id="load-profile" onClick={this.loadProfile}>Load</button>

                    {/*SHIPPING INFORMATION*/}
                    <ShippingFields onChange={this.onShippingFieldsChange} errors={this.state.errors} />

                    {/*BILLING INFORMATION*/}
                    <BillingFields onChange={this.onBillingFieldsChange} errors={this.state.errors} />

                    {/*PAYMENT INFORMATION*/}
                    <PaymentFields onChance={this.onPaymentFieldsChange} errors={this.state.errors} />

                    {/*SAVE PROFILE*/}
                    <input id="profile-save" type="text" placeholder="Profile Name" required />
                    <button id="submit-profile" onClick={this.saveProfile}>Save</button>
                </div>
            </form>
        );
    }
}

export default Profiles;