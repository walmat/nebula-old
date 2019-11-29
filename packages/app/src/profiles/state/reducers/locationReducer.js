import { mapLocationFieldToKey, LOCATION_FIELDS } from '../../../store/actions';
import { location } from '../initial';

const locationReducer = (state = location, action) => {
  console.log('location reducer handling action: ', action);

  let change = {};
  if (!mapLocationFieldToKey[action.type]) {
    // If we can't map the field to a location key, don't change anything
    return state;
  }
  if (action.errors) {
    change = {
      errors: action.errors || state.errors,
    };
  }
  switch (action.type) {
    case LOCATION_FIELDS.COUNTRY:
      if (!action.value || (state.country && action.value.value === state.country.value)) {
        break;
      }
      change = {
        [mapLocationFieldToKey[LOCATION_FIELDS.COUNTRY]]: action.value,
        [mapLocationFieldToKey[LOCATION_FIELDS.PROVINCE]]: null,
        errors: action.errors || state.errors,
      };
      break;
    case LOCATION_FIELDS.PROVINCE:
      if (
        !action.value ||
        !action.value.province ||
        (state.province && action.value.province.value === state.province.value)
      ) {
        break;
      }
      change = {
        [mapLocationFieldToKey[LOCATION_FIELDS.PROVINCE]]: action.value.province,
        errors: action.errors || state.errors,
      };
      break;
    default: {
      change = {
        [mapLocationFieldToKey[action.type]]:
          action.value || location[mapLocationFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }
  return Object.assign({}, state, change);
};
export default locationReducer;
