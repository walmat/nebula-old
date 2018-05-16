import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
		const errors = this.state.errors;
        return (
			<div className="flex-col">
				<h2>Shipping Information</h2>
				<input placeholder="First Name" onChange={this.onFirstNameChange} value={this.state.shipping.firstName} style={this.setBorderColor(errors['/shipping/firstName'])}></input>
				<input placeholder="Last Name" onChange={this.onLastNameChange} value={this.state.shipping.lastName} required style={this.setBorderColor(errors['/shipping/lastName'])}></input>
				<br></br>
				<input placeholder="Address" onChange={this.onAddressChange} value={this.state.shipping.address} style={this.setBorderColor(errors['/shipping/address'])}></input>
				<input placeholder="Apt/Suite" onChange={this.onAptChange} value={this.state.shipping.apt} style={this.setBorderColor(errors['/shipping/apt'])}></input>
				<br></br>
				<input placeholder="City" onChange={this.onCityChange} value={this.state.shipping.city} style={this.setBorderColor(errors['/shipping/city'])}></input>
				<br></br>
				<select onChange={this.onCountryChange} value={this.state.shipping.country} style={this.setBorderColor(errors['/shipping/country'])}>
					<option value="" selected disabled hidden>Country</option>
					<option>United States</option>
				</select>
				<select onChange={this.onStateChange} value={this.state.shipping.state} style={this.setBorderColor(errors['/shipping/firstName'])}>
					<option value="" selected disabled hidden>State</option>
					<option>Alaska</option>
				</select>
				<input placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.state.shipping.zipCode} style={this.setBorderColor(errors['/shipping/zipCode'])}></input>
				<br></br>
				<input placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.state.shipping.phone} style={this.setBorderColor(errors['/shipping/phone'])}></input>
			</div>
        );
    }
}

ShippingFields.propTypes = {
    errors: PropTypes.errors,
    onChange: PropTypes.func
};

export default ShippingFields;