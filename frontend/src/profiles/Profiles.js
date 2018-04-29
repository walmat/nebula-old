import React, { Component } from 'react';
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

class Profiles extends Component {

    constructor(props) {
        super(props);
        this.fillExpiration = this.fillExpiration.bind(this);
        this.saveProfile = this.saveProfile.bind(this);
        this.loadProfile = this.loadProfile.bind(this);
    }

    /**
     * store the profile in the database for the user
     * @param e
     */
    saveProfile(e) {
        // saves input data to user's profiles
        e.preventDefault();

        const
            s_country_id = document.getElementById('sCountry'),
            s_state_id = document.getElementById('sState'),
            b_country_id = document.getElementById('bCountry'),
            b_state_id = document.getElementById('bState');

        const
            sFirstName = document.getElementById('sFirstName').value,
            sLastName = document.getElementById('sLastName').value,
            sAddress1 = document.getElementById('sAddress1').value,
            sAddress2 = document.getElementById('sAddress2').value,
            sCity = document.getElementById('sCity').value,
            sCountry = s_country_id.options[s_country_id.selectedIndex].text,
            sState = s_state_id.options[s_state_id.selectedIndex].text,
            sZipCode = document.getElementById('sZipCode').value,
            sPhone = document.getElementById('sPhone').value,

            bFirstName = document.getElementById('bFirstName').value,
            bLastName = document.getElementById('bLastName').value,
            bAddress1 = document.getElementById('bAddress1').value,
            bAddress2 = document.getElementById('bAddress2').value,
            bCity = document.getElementById('bCity').value,
            bCountry = b_country_id.options[b_country_id.selectedIndex].text,
            bState = b_state_id.options[b_state_id.selectedIndex].text,
            bZipCode = document.getElementById('bZipCode').value,
            bPhone = document.getElementById('bPhone').value,

            email = document.getElementById('email').value,
            cc = document.getElementById('cCardNumber').value,
            exp = document.getElementById('cExpiration').value,
            cvv = document.getElementById('cCVV').value,

            profileName = document.getElementById('profile-save').value;


        /*Store the profile in the db*/
        fetch('http://localhost:8080/profiles',
            {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profileName: profileName,
                    shipping: {
                        "sFirstName": sFirstName,
                        "sLastName": sLastName,
                        "sAddress1": sAddress1,
                        "sAddress2": sAddress2,
                        "sCity": sCity,
                        "sCountry": sCountry,
                        "sState": sState,
                        "sZipCode": sZipCode,
                        "sPhone": sPhone
                    },
                    billing: {
                        "bFirstName": bFirstName,
                        "bLastName": bLastName,
                        "bAddress1": bAddress1,
                        "bAddress2": bAddress2,
                        "bCity": bCity,
                        "bCountry": bCountry,
                        "bState": bState,
                        "bZipCode": bZipCode,
                        "bPhone": bPhone
                    },
                    payment: {
                        "email": email,
                        "cc": cc,
                        "exp": exp,
                        "cvv": cvv
                    }
                })
            })
            .then(res => console.log(res));
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

    render() {
        return (
            <div className="container">
                <div className="flex-container">
                    <div className="flex-row">
                        <div className="flex-col">
                            <h2>Shipping Information</h2>
                            <input id="sFirstName" type="text" placeholder="First Name" required></input>
                            <input id="sLastName" type="text" placeholder="Last Name" required></input>
                            <br></br>
                            <input id="sAddress1" type="text" placeholder="Address" required></input>
                            <input id="sAddress2" type="text" placeholder="Apt/Suite"></input>
                            <br></br>
                            <input id="sCity" type="text" placeholder="City" required></input>
                            <br></br>
                            <select id="sCountry">
                                <option value="" selected disabled hidden>Country</option>
                                <option>United States</option>
                            </select>
                            <select id="sState">
                                <option value="" selected disabled hidden>State</option>
                                <option>Alaska</option>
                            </select>
                            <input id="sZipCode" type="text" placeholder="Zip Code" required></input>
                            <br></br>
                            <input id="sPhone" type="text" placeholder="Phone" required></input>
                        </div>
                        <div className="flex-col">
                            <h2>Billing Information</h2>
                            <input id="bFirstName" type="text" placeholder="First Name" required></input>
                            <input id="bLastName" type="text" placeholder="Last Name" required></input>
                            <br></br>
                            <input id="bAddress1" type="text" placeholder="Address" required></input>
                            <input id="bAddress2" type="text" placeholder="Apt/Suite"></input>
                            <br></br>
                            <input id="bCity" type="text" placeholder="City" required></input>
                            <br></br>
                            <select id="bCountry">
                                <option value="" selected disabled hidden>Country</option>
                                <option>United States</option>
                            </select>
                            <select id="bState">
                                <option value="" selected disabled hidden>State</option>
                                <option>Alaska</option>
                            </select>
                            <input id="bZipCode" type="text" placeholder="Zip Code" required></input>
                            <br></br>
                            <input id="bPhone" type="text" placeholder="Phone" required></input>
                            <br></br>
                            <input type="checkbox" name="checkbox" id="match"></input>
                            <label htmlFor="match">Same as shipping information</label>
                        </div>
                    </div>
                    <div className="flex-row">
                        <div className="flex-col">
                            <h2>Payment Information</h2>
                            <input id="email" type="text" placeholder="Email Address" required></input>
                            <br></br>
                            <input id="cCardNumber" type="text" placeholder="Card Number" required></input>
                            <br></br>
                            <input id="cExpiration" type="text" placeholder="Expiration" required></input>
                            <input id="cCVV" type="text" placeholder="CVV" required></input>
                        </div>
                    </div>
                    <div>
                        <h3>Save Profile</h3>
                        <input id="profile-save" type="text" placeholder="Profile 1" required></input>
                        <button id="submit-profile" onClick={this.saveProfile}>Save</button>
                    </div>
                    <div>
                        <h3>Load Profile</h3>
                        <select id="profile-load">
                            <option value="" selected disabled hidden>Choose a Profile</option>
                            <option>Profile 1</option>
                        </select>
                        <button id="load-profile" onClick={this.loadProfile}>Load</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Profiles;