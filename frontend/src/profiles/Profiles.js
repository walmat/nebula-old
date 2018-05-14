import React, { Component } from 'react';
// import ValidationErrors from '../utils/ValidationErrors';

const errorStyle = {
    borderColor: 'red',
    backgroundImage: "url('../_assets/Symbol_check-01.png')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right center',
    backgroundOrigin: 'content-box'
};

class Profiles extends Component {

    constructor(props) {
        super(props);
        this.state = {
            errors: {}
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

        const
            s_country_id = document.getElementById('sCountry'),
            s_state_id = document.getElementById('sState'),
            b_country_id = document.getElementById('bCountry'),
            b_state_id = document.getElementById('bState');

        const
            sFirstName = document.getElementById('sFirstName').value,
            sLastName = document.getElementById('sLastName').value,
            sAddress1 = document.getElementById('sAddress1').value,
            sAddress2 = document.getElementById('apt').value,
            sCity = document.getElementById('sCity').value,
            sCountry = s_country_id.options[s_country_id.selectedIndex].text,
            sState = s_state_id.options[s_state_id.selectedIndex].text,
            sZipCode = document.getElementById('sZipCode').value,
            sPhone = document.getElementById('sPhone').value,

            bFirstName = document.getElementById('bFirstName').value,
            bLastName = document.getElementById('bLastName').value,
            bAddress1 = document.getElementById('bAddress1').value,
            bAddress2 = document.getElementById('bApt').value,
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
        try {
            let response = await fetch('http://localhost:8080/profiles',
            {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profileName: profileName,
                    shipping: {
                        "firstName": sFirstName,
                        "lastName": sLastName,
                        "address": sAddress1,
                        "city": sCity,
                        "country": sCountry,
                        "state": sState,
                        "zipCode": sZipCode,
                        "phone": sPhone
                    },
                    billing: {
                        "firstName": bFirstName,
                        "lastName": bLastName,
                        "address": bAddress1,
                        "city": bCity,
                        "country": bCountry,
                        "state": bState,
                        "zipCode": bZipCode,
                        "phone": bPhone
                    },
                    payment: {
                        "email": email,
                        "cardNumber": cc,
                        "exp": exp,
                        "cvv": cvv
                    }
                })
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

    setBorderColor(validationErrors) {
        return validationErrors ? errorStyle : {
            backgroundImage: "url(../_assets/Symbol_check-01.png)",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
            backgroundOrigin: 'content-box'
        };
    }
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

    render() {
        const errors = this.state.errors;
        return (
            <form>
                <div className="container">
                    <div className="flex-container">
                        <div className="flex-row">
                            <div className="flex-col">
                                <h2>Shipping Information</h2>
                                <input id="sFirstName" type="text" placeholder="First Name" required style={this.setBorderColor(errors['/shipping/firstName'])}></input>
                                <input id="sLastName" type="text" placeholder="Last Name" required style={this.setBorderColor(errors['/shipping/lastName'])}></input>
                                <br></br>
                                <input id="sAddress1" type="text" placeholder="Address" required style={this.setBorderColor(errors['/shipping/address'])}></input>
                                <input id="apt" type="text" placeholder="Apt/Suite" style={this.setBorderColor(errors['/shipping/apt'])}></input>
                                <br></br>
                                <input id="sCity" type="text" placeholder="City" required style={this.setBorderColor(errors['/shipping/city'])}></input>
                                <br></br>
                                <select id="sCountry" style={this.setBorderColor(errors['/shipping/country'])}>
                                    <option value="" selected disabled hidden>Country</option>
                                    <option>United States</option>
                                </select>
                                <select id="sState" style={this.setBorderColor(errors['/shipping/state'])}>
                                    <option value="" selected disabled hidden>State</option>
                                    <option>Alaska</option>
                                </select>
                                <input id="sZipCode" type="text" placeholder="Zip Code" required style={this.setBorderColor(errors['/shipping/zipCode'])}></input>
                                <br></br>
                                <input id="sPhone" type="text" placeholder="Phone" required style={this.setBorderColor(errors['/shipping/phone'])}></input>
                            </div>
                            <div className="flex-col">
                                <h2>Billing Information</h2>
                                <input id="bFirstName" type="text" placeholder="First Name" required style={this.setBorderColor(errors['/billing/firstName'])}></input>
                                <input id="bLastName" type="text" placeholder="Last Name" required style={this.setBorderColor(errors['/billing/lastName'])}></input>
                                <br></br>
                                <input id="bAddress1" type="text" placeholder="Address" required style={this.setBorderColor(errors['/billing/address'])}></input>
                                <input id="bApt" type="text" placeholder="Apt/Suite" style={this.setBorderColor(errors['/billing/apt'])}></input>
                                <br></br>
                                <input id="bCity" type="text" placeholder="City" required style={this.setBorderColor(errors['/billing/city'])}></input>
                                <br></br>
                                <select id="bCountry" style={this.setBorderColor(errors['/billing/country'])}>
                                    <option value="" selected disabled hidden>Country</option>
                                    <option>United States</option>
                                </select>
                                <select id="bState" style={this.setBorderColor(errors['/billing/state'])}>
                                    <option value="" selected disabled hidden>State</option>
                                    <option>Alaska</option>
                                </select>
                                <input id="bZipCode" type="text" placeholder="Zip Code" required style={this.setBorderColor(errors['/billing/zipCode'])}></input>
                                <br></br>
                                <input id="bPhone" type="text" placeholder="Phone" required style={this.setBorderColor(errors['/billing/phone'])}></input>
                                <br></br>
                                <input type="checkbox" name="checkbox" id="match" onClick={this.setDisabled}></input>
                                <label htmlFor="match">Same as shipping information</label>
                            </div>
                        </div>
                        <div className="flex-row">
                            <div className="flex-col">
                                <h2>Payment Information</h2>
                                <input id="email" type="text" placeholder="Email Address" required style={this.setBorderColor(errors['/payment/email'])}></input>
                                <br></br>
                                <input id="cCardNumber" type="text" placeholder="Card Number" required style={this.setBorderColor(errors['/payment/cardNumber'])}></input>
                                <br></br>
                                <input id="cExpiration" type="text" placeholder="Expiration" required style={this.setBorderColor(errors['/payment/exp'])}></input>
                                <input id="cCVV" type="text" placeholder="CVV" required style={this.setBorderColor(errors['/payment/cvv'])}></input>
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
            </form>
        );
    }
}

export default Profiles;