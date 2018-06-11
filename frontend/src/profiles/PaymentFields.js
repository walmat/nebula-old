import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../state/Actions';

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
                <input required id="email" placeholder="Email Address" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EMAIL)} value={this.props.value.email} style={validationStatus(errors[PAYMENT_FIELDS.EMAIL])} />
                <input required id="card-number" placeholder="XXXX XXXX XXXX XXXX" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CARD_NUMBER)} value={this.props.value.cardNumber} style={validationStatus(errors[PAYMENT_FIELDS.CARD_NUMBER])}/>
                <input required id="expiration" placeholder="Expiration" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EXP)} value={this.props.value.exp} style={validationStatus(errors[PAYMENT_FIELDS.EXP])}/>
                <input required id="cvv" placeholder="CVV" onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CVV)} value={this.props.value.cvv} style={validationStatus(errors[PAYMENT_FIELDS.CVV])}/>
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

const mapStateToProps = (state, ownProps) => {
  return {
    errors: ownProps.profileToEdit.payment.errors,
    value: ownProps.profileToEdit.payment,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(
        ownProps.profileToEdit.id,
        PROFILE_FIELDS.EDIT_PAYMENT,
        changes.value,
        changes.field,
      ));
    },
  };
};
  
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFields);
