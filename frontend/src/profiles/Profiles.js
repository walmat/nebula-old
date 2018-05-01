import React, { Component } from 'react';
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

class Profiles extends Component {

    constructor(props) {
        super(props);
        this.fillExpiration = this.fillExpiration.bind(this);
    }

    saveProfile() {
        // saves input data to user's profiles

    }

    loadProfile() {
        // loads profile to screen (editing purposes mainly)
    }

    exportProfiles() {
        // saves the user's profiles to a json file
    }

    importProfiles() {
        // loads a json file into user's profile
    }


    /* HELPER METHODS */

    /* FORM METHODS */
    fillExpiration() {
        let exp = document.getElementById("cExpiration");
        console.log(exp);
    }

    render() {
        return (
            <div className="container">
                <div className="flex-container">
                    <div className="flex-row">
                        <div className="flex-col">
                            <h2>Shipping Information</h2>
                            <form action="/tasks/" method="post">
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
                            </form>
                        </div>
                        <div className="flex-col">
                            <h2>Billing Information</h2>
                            <form>
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
                            </form>
                        </div>
                    </div>
                    <div className="flex-row">
                        <div className="flex-col">
                            <h2>Payment Information</h2>
                            <form>
                                <input id="email" type="text" placeholder="Email Address" required></input>
                                <br></br>
                                <input id="cCardNumber" type="text" placeholder="Card Number" required></input>
                                <br></br>
                                <input id="cExpiration" type="text" placeholder="Expiration" required></input>
                                <input id="cCVV" type="text" placeholder="CVV" required></input>
                            </form>
                        </div>
                    </div>
                    <div>
                        <h3>Save Profile</h3>
                        <input id="profile-save" type="text" placeholder="Profile 1" required></input>
                        <button id="submit-profile" onClick="saveProfile()">Save</button>
                    </div>
                    <div>
                        <h3>Load Profile</h3>
                        <select id="profile-load">
                            <option value="" selected disabled hidden>Choose a Profile</option>
                            <option>Profile 1</option>
                        </select>
                        <button id="load-profile">Load</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Profiles;