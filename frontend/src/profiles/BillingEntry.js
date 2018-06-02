import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { editProfile , EDIT_BILLING } from '../state/actions/profiles/ProfileActions';

const mapStateToProps = (state, ownProps) => {
  return {
    id: ownProps.id,
    disabled: ownProps.disabled,
    errors: ownProps.errors,
    value: state.currentProfile.billing
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(editProfile(0, EDIT_BILLING, changes.value, changes.field));
    }
  };
};

const BillingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default BillingEntry;
