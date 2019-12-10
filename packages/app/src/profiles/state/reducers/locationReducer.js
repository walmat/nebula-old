import { mapLocationFieldToKey, LOCATION_FIELDS } from '../../../store/actions';
import { location } from '../initial';

const locationReducer = (state = location, action) => {
  const { type, value } = action;
  if (!type || !mapLocationFieldToKey[type]) {
    // If we can't map the field to a location key, don't change anything
    return state;
  }

  switch (type) {
    case LOCATION_FIELDS.COUNTRY: {
      if (!value || (state.country && value.value === state.country.value)) {
        return state;
      }

      return {
        ...state,
        [mapLocationFieldToKey[LOCATION_FIELDS.COUNTRY]]: value,
        [mapLocationFieldToKey[LOCATION_FIELDS.PROVINCE]]: null,
      };
    }
    case LOCATION_FIELDS.PROVINCE: {
      if (
        !value ||
        !value.province ||
        (state.province && value.province.value === state.province.value)
      ) {
        return state;
      }
      return {
        ...state,
        [mapLocationFieldToKey[LOCATION_FIELDS.PROVINCE]]: value.province,
      };
    }
    default: {
      return {
        ...state,
        [mapLocationFieldToKey[action.type]]: value,
      };
    }
  }
};

export default locationReducer;
