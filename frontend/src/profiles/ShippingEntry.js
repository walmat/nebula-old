import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { profileActions , EDIT_SHIPPING } from '../state/actions/Actions';

const mapStateToProps = (state, ownProps) => {
  return {
    id: ownProps.id,
    disabled: ownProps.disabled,
    errors: ownProps.errors,
    value: state.currentProfile.shipping
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onChange: (changes) => {
      dispatch(profileActions.edit(0, EDIT_SHIPPING, changes.value, changes.field));
    }
  };
};

const ShippingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default ShippingEntry;
