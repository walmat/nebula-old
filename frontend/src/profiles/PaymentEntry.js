import { connect } from 'react-redux';

import PaymentFields from './PaymentFields';
import { profileActions, EDIT_PAYMENT } from '../state/actions/Actions'

const mapStateToProps = (state, ownProps) => {
  return {
    errors: ownProps.errors,
    value: state.currentProfile.payment
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(0, EDIT_PAYMENT, changes.value, changes.field));
    }
  };
};

const PaymentEntry = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFields);

export default PaymentEntry;
