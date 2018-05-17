import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

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
				<h2>Shipping Information</h2>
				<input placeholder="First Name" onChange={this.onFirstNameChange} value={this.state.shipping.firstName} style={validationStatus(errors['/shipping/firstName'])}></input>
				<input placeholder="Last Name" onChange={this.onLastNameChange} value={this.state.shipping.lastName} required style={validationStatus(errors['/shipping/lastName'])}></input>
				<br></br>
				<input placeholder="Address" onChange={this.onAddressChange} value={this.state.shipping.address} style={validationStatus(errors['/shipping/address'])}></input>
				<input placeholder="Apt/Suite" onChange={this.onAptChange} value={this.state.shipping.apt} style={validationStatus(errors['/shipping/apt'])}></input>
				<br></br>
				<input placeholder="City" onChange={this.onCityChange} value={this.state.shipping.city} style={validationStatus(errors['/shipping/city'])}></input>
				<br></br>
				<select onChange={this.onCountryChange} selected={this.state.shipping.country} style={validationStatus(errors['/shipping/country'])}>
					<option value="" selected disabled hidden>Country</option>
					<option>United States</option>
				</select>
				<select onChange={this.onStateChange} selected={this.state.shipping.state} style={validationStatus(errors['/shipping/firstName'])}>
					<option value="" selected disabled hidden>State</option>
					<option>Alaska</option>
				</select>
				<input placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.state.shipping.zipCode} style={validationStatus(errors['/shipping/zipCode'])}></input>
				<br></br>
				<input placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.state.shipping.phone} style={validationStatus(errors['/shipping/phone'])}></input>
			</div>
        );
    }
}

ShippingFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func
};

export default ShippingFields;