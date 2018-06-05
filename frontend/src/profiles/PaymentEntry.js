import { connect } from 'react-redux';

import PaymentFields from './PaymentFields';
import { profileActions, PROFILE_FIELDS } from '../state/Actions';

const mapStateToProps = (state) => {
  return {
    errors: state.currentProfile.payment.errors,
    value: state.currentProfile.payment,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(
        ownProps.idToEdit,
        PROFILE_FIELDS.EDIT_PAYMENT,
        changes.value,
        changes.field,
      ));
    },
  };
};

const PaymentEntry = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFields);

export default PaymentEntry;
