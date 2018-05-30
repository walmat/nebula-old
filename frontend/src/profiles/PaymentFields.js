import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

import info from '../_assets/info.svg';

import './Profiles.css';

class PaymentFields extends Component {

    constructor(props) {
        super(props);
    }

    broadCastChanges = (updatedPayment, fieldChanged) => {
        this.props.onChange(updatedPayment, fieldChanged);
    };

    onEmailChange = (event) => {
        let payment = this.props.value;
        payment.email = event.target.value;
        this.broadCastChanges(payment, 'email');
    };

    onCardChange = (event) => {
        let payment = this.props.value;
        payment.cardNumber = event.target.value;
        this.broadCastChanges(payment, 'cardNumber');
    };

    onExpirationChange = (event) => {
        let payment = this.props.value;
        payment.exp = event.target.value;
        this.broadCastChanges(payment, 'exp');
    };

    onCVVChange = (event) => {
        let payment = this.props.value;
        payment.cvv = event.target.value;
        this.broadCastChanges(payment, 'cvv');
    };

    render() {
        const errors = this.props.errors;
        return (
            <div className="flex-col">
                <p className="body-text" id="payment-label">Payment</p>
                <input id="email" placeholder="Email Address" onChange={this.onEmailChange} value={this.props.value.email} style={validationStatus(errors['/email'])} />
                <input id="card-number" placeholder="XXXX XXXX XXXX XXXX" onChange={this.onCardChange} value={this.props.value.cardNumber} required style={validationStatus(errors['/cardNumber'])}/>
                <input id="expiration" placeholder="Expiration" onChange={this.onExpirationChange} value={this.props.value.exp} style={validationStatus(errors['/exp'])}/>
                <input id="cvv" placeholder="CVV" onChange={this.onCVVChange} value={this.props.value.cvv} style={validationStatus(errors['/cvv'])}/>
                <img src={info} id="payment-info-btn" />
            </div>
        );
    }
}

PaymentFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func,
    value: PropTypes.object
};

export default PaymentFields;