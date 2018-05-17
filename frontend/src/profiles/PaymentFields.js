import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

import info from '../_assets/info.svg';

import './Profiles.css';

class PaymentFields extends Component {

    constructor(props) {
        super(props);
        this.state = {
            errors: {},
            payment: {
                email: '',
                cardNumber: '',
                exp: '',
                cvv: ''
            }
        };
    }

    broadCastChanges = () => {
        this.props.onChange(this.state.payment);
    };

    onEmailChange = (event) => {
        let payment = this.state.payment;
        payment.email = event.target.value;
        this.setState(payment, this.broadCastChanges);
    };

    onCardChange = (event) => {
        let payment = this.state.payment;
        payment.cardNumber = event.target.value;
        this.setState(payment, this.broadCastChanges);
    };

    onExpirationChange = (event) => {
        let payment = this.state.payment;
        payment.exp = event.target.value;
        this.setState(payment, this.broadCastChanges);
    };

    onCVVChange = (event) => {
        let payment = this.state.payment;
        payment.cvv = event.target.value;
        this.setState(payment, this.broadCastChanges);
    };

    render() {
        const errors = this.props.errors;
        return (
            <div className="flex-col">
                <p className="body-text" id="payment-label">Payment</p>
                <input id="email" placeholder="Email Address" onChange={this.onEmailChange} value={this.state.payment.email} style={validationStatus(errors['/payment/email'])} />
                <input id="card-number" placeholder="XXXX XXXX XXXX XXXX" onChange={this.onCardChange} value={this.state.payment.cardNumber} required style={validationStatus(errors['/payment/cardNumber'])}/>
                <input id="expiration" placeholder="Expiration" onChange={this.onExpirationChange} value={this.state.payment.exp} style={validationStatus(errors['/payment/exp'])}/>
                <input id="cvv" placeholder="CVV" onChange={this.onCVVChange} value={this.state.payment.cvv} style={validationStatus(errors['/payment/cvv'])}/>
                <img src={info} id="payment-info-btn" />
            </div>
        );
    }
}

PaymentFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func
};

export default PaymentFields;