import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

import './Profiles.css';

const errorStyle = {
    borderColor: 'red'
};

class BillingFields extends Component {

    constructor(props) {
        super(props);
        this.state = {
            errors: {},
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
            }
        }
    }

    broadCastChanges = () => {
        this.props.onChange(this.state.billing);
    }
    setBorderColor(validationErrors) {
        return validationErrors ? errorStyle : {};
    }

    onFirstNameChange = (event) => {
        let billing = this.state.billing;
        billing.firstName = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onLastNameChange = (event) => {
        let billing = this.state.billing;
        billing.lastName = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onAddressChange = (event) => {
        let billing = this.state.billing;
        billing.address = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onAptChange = (event) => {
        let billing = this.state.billing;
        billing.apt = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onCityChange = (event) => {
        let billing = this.state.billing;
        billing.city = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onZipCodeChange = (event) => {
        let billing = this.state.billing;
        billing.zipCode = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onPhoneNumberChange = (event) => {
        let billing = this.state.billing;
        billing.phone = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onCountryChange = (event) => {
        let billing = this.state.billing;
        billing.country = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    onStateChange = (event) => {
        let billing = this.state.billing;
        billing.state = event.target.value;
        this.setState(billing, this.broadCastChanges);
    }

    render() {
        const errors = this.props.errors;
        return (
            <div className="flex-col">
                <p className="body-text" id="billing-label">Billing</p>
                <input id="billing-first-name" placeholder="First Name" onChange={this.onFirstNameChange} value={this.state.billing.firstName} style={validationStatus(errors['/billing/firstName'])} />
                <input id="billing-last-name" placeholder="Last Name" onChange={this.onLastNameChange} value={this.state.billing.lastName} required style={validationStatus(errors['/billing/lastName'])}/>
                <input id="billing-address-one" placeholder="Address Line 1" onChange={this.onAddressChange} value={this.state.billing.address} style={validationStatus(errors['/billing/address'])}/>
                <input id="billing-address-two" placeholder="Address Line 2" onChange={this.onAptChange} value={this.state.billing.apt} style={validationStatus(errors['/billing/apt'])}/>
                <input id="billing-city" placeholder="City" onChange={this.onCityChange} value={this.state.billing.city} style={validationStatus(errors['/billing/city'])}/>
                <select id="billing-state" onChange={this.onStateChange} selected={this.state.billing.state} style={validationStatus(errors['/billing/state'])}>
                    <option>Alaska</option>
                </select>
                <input id="billing-zip-code" placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.state.billing.zipCode} style={validationStatus(errors['/billing/zipCode'])}/>
                <select id="billing-country" onChange={this.onCountryChange} selected={this.state.billing.country} style={validationStatus(errors['/billing/country'])}>
                    <option>United States</option>
                </select>
                <input id="billing-phone" placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.state.billing.phone} style={validationStatus(errors['/billing/phone'])}/>
            </div>
        );
    }
}

BillingFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func
};

export default BillingFields;