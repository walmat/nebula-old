import { mapLocationFieldToKey, LOCATION_FIELDS } from '../../actions';
import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

const locationReducer = (state = initialProfileStates.location, action) => {
  let change = {};
  if (!mapLocationFieldToKey[action.type]) {
    // If we can't map the field to a location key, don't change anything
    return Object.assign({}, state);
  }
  switch (action.type) {
    // when they switch countries, reset state as well
    case LOCATION_FIELDS.COUNTRY:
      change = {
        [LOCATION_FIELDS.COUNTRY]: action.value,
        [LOCATION_FIELDS.STATE]: null,
        errors: action.errors || state.errors,
      };
      break;
    case LOCATION_FIELDS.STATE:
      change = {
        [mapLocationFieldToKey[action.type]]: action.value.state,
        errors: action.errors || state.errors,
      };
      break;
    default: {
      change = {
        [mapLocationFieldToKey[action.type]]:
          action.value || initialProfileStates.location[mapLocationFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }
  return Object.assign({}, state, change);
};
export default locationReducer;
