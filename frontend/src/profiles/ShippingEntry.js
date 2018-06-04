import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { profileActions , PROFILE_FIELDS } from '../state/Actions';

const mapStateToProps = (state, ownProps) => {
  return {
    id: ownProps.id,
    disabled: ownProps.disabled,
    errors: state.currentProfile.shipping.errors,
    value: state.currentProfile.shipping
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(0, PROFILE_FIELDS.EDIT_SHIPPING, changes.value, changes.field));
    }
  };
};

const ShippingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default ShippingEntry;
