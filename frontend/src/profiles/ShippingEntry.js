import { connect } from 'react-redux';

import LocationFields from './LocationFields';
import { editProfile , EDIT_SHIPPING } from '../state/actions/profiles/ProfileActions';

const mapStateToProps = (state, ownProps) => {
  console.log(state);
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
      console.log(`editProfile: current, ${EDIT_SHIPPING}`);
      console.log(changes);
      console.log(editProfile(0, EDIT_SHIPPING, changes.value, changes.field));
      dispatch(editProfile(0, EDIT_SHIPPING, changes.value, changes.field));
    }
  };
};

const ShippingEntry = connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationFields);

export default ShippingEntry;
