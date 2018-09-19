import { mapLocationFieldToKey } from '../../actions';
import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

const locationReducer = (state = initialProfileStates.location, action) => {
  let change = {};
  switch (action.type) {
    default: {
      change = {
        [mapLocationFieldToKey[action.type]]: action.value,
      };
      break;
    }
  }
  change.errors = action.errors;
  return Object.assign({}, state, change);
};
export default locationReducer;
