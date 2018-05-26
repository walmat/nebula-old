import React, { Component } from 'react';
import BillingFields from './BillingFields';
import PaymentFields from './PaymentFields';
import './Profiles.css';

// images
import DDD from '../_assets/dropdown-down.svg';
import checkboxUnchecked from '../_assets/Check_icons-02.svg';
import checkboxChecked from '../_assets/Check_icons-01.svg';
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
     * sets the billing fields to disabled if the 'matched' checkbox is checked
     *
     * **NOTE – use '.src' to find whether or not it matches elsewhere
     */
    setDisabled() {
        console.log(document.getElementById('billing-match-shipping').src);
        if (document.getElementById('billing-match-shipping').getAttribute('src') === checkboxChecked) {
            document.getElementById('billing-match-shipping').setAttribute('src', checkboxUnchecked);
            document.getElementById('billing-first-name').disabled = false;
            document.getElementById('billing-first-name').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-last-name').disabled = false;
            document.getElementById('billing-last-name').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-address-one').disabled = false;
            document.getElementById('billing-address-one').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-address-two').disabled = false;
            document.getElementById('billing-address-two').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-city').disabled = false;
            document.getElementById('billing-city').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-state').disabled = false;
            document.getElementById('billing-state').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-zip-code').disabled = false;
            document.getElementById('billing-zip-code').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-country').disabled = false;
            document.getElementById('billing-country').style.backgroundColor = '#F5F5F5';
            document.getElementById('billing-phone').disabled = false;
            document.getElementById('billing-phone').style.backgroundColor = '#F5F5F5';
        } else {
            document.getElementById('billing-match-shipping').setAttribute('src', checkboxChecked);
            document.getElementById('billing-first-name').disabled = true;
            document.getElementById('billing-first-name').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-last-name').disabled = true;
            document.getElementById('billing-last-name').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-address-one').disabled = true;
            document.getElementById('billing-address-one').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-address-two').disabled = true;
            document.getElementById('billing-address-two').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-city').disabled = true;
            document.getElementById('billing-city').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-state').disabled = true;
            document.getElementById('billing-state').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-zip-code').disabled = true;
            document.getElementById('billing-zip-code').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-country').disabled = true;
            document.getElementById('billing-country').style.backgroundColor = '#e5e5e5';
            document.getElementById('billing-phone').disabled = true;
            document.getElementById('billing-phone').style.backgroundColor = '#e5e5e5';
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

    onPaymentFieldsChange = (payment) => {
        let currentProfile = this.state.currentProfile;
        currentProfile.payment = payment;
        this.setState(currentProfile);
    };

    buildRealtiveErrors = (basePath) => {
        const errors = this.state.errors;
        let relativeErrors = {};
        Object.keys(errors).forEach((path) => {
            if (path.startsWith(basePath)) {
                relativeErrors[path.replace(basePath, '')] = errors[path];
            }
        });
        console.log(relativeErrors);
        return relativeErrors;
    }

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
                    <div className="flex-col">
				        <p className="body-text" id="shipping-label">Shipping</p>
                        <LocationFields onChange={this.onShippingFieldsChange} errors={this.buildRealtiveErrors('/shipping')} disabled={false} />
                    </div>

                    {/*BILLING MATCHES SHIPPING*/}
                    <img src={checkboxUnchecked} id="billing-match-shipping" onClick={this.setDisabled} />

                    {/*BILLING INFORMATION*/}
                    <div className="flex-col">
                        <p className="body-text" id="billing-label">Billing</p>
                        <BillingFields onChange={this.onBillingFieldsChange} errors={errors} disabled={false}/>
                    </div>

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