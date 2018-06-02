import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { editProfile , EDIT_SHIPPING } from '../state/actions/profiles/ProfileActions';

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
      dispatch(editProfile(0, EDIT_SHIPPING, changes.value, changes.field));
    }
  };
};

const ShippingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default ShippingEntry;
