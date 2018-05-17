import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

import './Profiles.css';

const errorStyle = {
    borderColor: 'red'
};

class ShippingFields extends Component {

    constructor(props) {
        super(props);
        this.state = {
            errors: {},
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
			}
        }
	}

	broadCastChanges = () => {
		this.props.onChange(this.state.shipping);
	}
	setBorderColor(validationErrors) {
        return validationErrors ? errorStyle : {};
    }

    onFirstNameChange = (event) => {
        let shipping = this.state.shipping;
        shipping.firstName = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onLastNameChange = (event) => {
        let shipping = this.state.shipping;
        shipping.lastName = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onAddressChange = (event) => {
        let shipping = this.state.shipping;
        shipping.address = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onAptChange = (event) => {
        let shipping = this.state.shipping;
        shipping.apt = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onCityChange = (event) => {
        let shipping = this.state.shipping;
        shipping.city = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onZipCodeChange = (event) => {
        let shipping = this.state.shipping;
        shipping.zipCode = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onPhoneNumberChange = (event) => {
        let shipping = this.state.shipping;
        shipping.phone = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onCountryChange = (event) => {
        let shipping = this.state.shipping;
        shipping.country = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

    onStateChange = (event) => {
        let shipping = this.state.shipping;
        shipping.state = event.target.value;
        this.setState(shipping, this.broadCastChanges);
    }

	render() {
        const errors = this.props.errors;
        return (
			<div className="flex-col">
				<p className="body-text" id="shipping-label">Shipping</p>
				<input id="shipping-first-name" placeholder="First Name" onChange={this.onFirstNameChange} value={this.state.shipping.firstName} style={validationStatus(errors['/shipping/firstName'])} />
				<input id="shipping-last-name" placeholder="Last Name" onChange={this.onLastNameChange} value={this.state.shipping.lastName} required style={validationStatus(errors['/shipping/lastName'])}/>
				<input id="shipping-address-one" placeholder="Address Line 1" onChange={this.onAddressChange} value={this.state.shipping.address} style={validationStatus(errors['/shipping/address'])}/>
				<input id="shipping-address-two" placeholder="Address Line 2" onChange={this.onAptChange} value={this.state.shipping.apt} style={validationStatus(errors['/shipping/apt'])}/>
                <input id="shipping-city" placeholder="City" onChange={this.onCityChange} value={this.state.shipping.city} style={validationStatus(errors['/shipping/city'])}/>
                <select id="shipping-state" onChange={this.onStateChange} selected={this.state.shipping.state} style={validationStatus(errors['/shipping/firstName'])}>
                    <option>Alaska</option>
                </select>
                <input id="shipping-zip-code" placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.state.shipping.zipCode} style={validationStatus(errors['/shipping/zipCode'])}/>
                <select id="shipping-country" onChange={this.onCountryChange} selected={this.state.shipping.country} style={validationStatus(errors['/shipping/country'])}>
					<option>United States</option>
				</select>
				<input id="shipping-phone" placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.state.shipping.phone} style={validationStatus(errors['/shipping/phone'])}/>
			</div>
        );
    }
}

ShippingFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func
};

export default ShippingFields;