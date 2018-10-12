import { mapLocationFieldToKey } from '../../actions';
import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

const locationReducer = (state = initialProfileStates.location, action) => {
  let change = {};
  if (!mapLocationFieldToKey[action.type]) {
    // If we can't map the field to a location key, don't change anything
    return Object.assign({}, state);
  }
  switch (action.type) {
    default: {
      change = {
        [mapLocationFieldToKey[action.type]]: action.value || state[mapLocationFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }
  return Object.assign({}, state, change);
};
export default locationReducer;
