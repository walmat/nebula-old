import React, { Component } from 'react';
import { connect } from 'react-redux';
import NumberFormat from 'react-number-format';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import defns from '../utils/definitions/profileDefinitions';
import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../state/actions';

import info from '../_assets/info.svg';

import './profiles.css';

export class PaymentFieldsPrimitive extends Component {

  createOnChangeHandler(field) {
    if (field === PAYMENT_FIELDS.CARD_NUMBER) {
      return (event) => {
        this.props.onChange({ field, value: event.target.value.replace(/\s/g, '') });
      };
    }
    return (event) => {
      this.props.onChange({ field, value: event.target.value });
    };
  }

  render() {
    const { errors } = this.props;
    return (
      <div className="flex-col">
        <p className="body-text" id="payment-label">Payment</p>
        <input required id="email" placeholder="Email Address" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EMAIL)} value={this.props.value.email} style={validationStatus(errors[PAYMENT_FIELDS.EMAIL])} />
        <NumberFormat format="#### #### #### ####" placeholder="XXXX XXXX XXXX XXXX" id="card-number" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CARD_NUMBER)} value={this.props.value.cardNumber} style={validationStatus(errors[PAYMENT_FIELDS.CARD_NUMBER])} />
        <NumberFormat format="##/##" id="expiration" placeholder="MM/YY" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EXP)} value={this.props.value.exp} style={validationStatus(errors[PAYMENT_FIELDS.EXP])} mask={['M', 'M', 'Y', 'Y']} />
        <input required id="cvv" placeholder="CVV" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CVV)} value={this.props.value.cvv} style={validationStatus(errors[PAYMENT_FIELDS.CVV])} />
        <img src={info} alt="payment info" id="payment-info-btn" />
      </div>
    );
  }
}

PaymentFieldsPrimitive.propTypes = {
  errors: defns.paymentStateErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  value: defns.paymentState.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  errors: ownProps.profileToEdit.payment.errors,
  value: ownProps.profileToEdit.payment,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes) => {
    dispatch(profileActions.edit(
      ownProps.profileToEdit.id,
      PROFILE_FIELDS.EDIT_PAYMENT,
      changes.value,
      changes.field,
    ));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFieldsPrimitive);
