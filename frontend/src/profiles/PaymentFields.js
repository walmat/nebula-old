import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import { PAYMENT_FIELDS } from '../state/actions/profiles/ProfileActions';

import info from '../_assets/info.svg';

import './Profiles.css';

class PaymentFields extends Component {

    constructor(props) {
        super(props);
    }

    createOnChangeHandler(field) {
      return (event) => {
        this.props.onChange({field: field, value: event.target.value});
      }
    }

    render() {
        const errors = this.props.errors;
        return (
            <div className="flex-col">
                <p className="body-text" id="payment-label">Payment</p>
                <input id="email" placeholder="Email Address" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EMAIL)} value={this.props.value.email} style={validationStatus(errors['/email'])} />
                <input id="card-number" placeholder="XXXX XXXX XXXX XXXX" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CARD_NUMBER)} value={this.props.value.cardNumber} required style={validationStatus(errors['/cardNumber'])}/>
                <input id="expiration" placeholder="Expiration" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EXP)} value={this.props.value.exp} style={validationStatus(errors['/exp'])}/>
                <input id="cvv" placeholder="CVV" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CVV)} value={this.props.value.cvv} style={validationStatus(errors['/cvv'])}/>
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
