import { connect } from 'react-redux';

import PaymentFields from './PaymentFields';
import { profileActions, PROFILE_FIELDS } from '../state/Actions'

const mapStateToProps = (state, ownProps) => {
  return {
    errors: ownProps.errors,
    value: state.currentProfile.payment
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(0, PROFILE_FIELDS.EDIT_PAYMENT, changes.value, changes.field));
    }
  };
};

const PaymentEntry = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFields);

export default PaymentEntry;
