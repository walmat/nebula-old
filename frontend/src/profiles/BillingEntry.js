import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { profileActions , PROFILE_FIELDS } from '../state/Actions';

const mapStateToProps = (state, ownProps) => {
  return {
    id: ownProps.id,
    disabled: ownProps.disabled,
    errors: state.currentProfile.billing.errors,
    value: state.currentProfile.billing
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(0, PROFILE_FIELDS.EDIT_BILLING, changes.value, changes.field));
    }
  };
};

const BillingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default BillingEntry;
