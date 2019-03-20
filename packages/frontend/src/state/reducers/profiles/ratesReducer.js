import initialProfileStates from '../../initial/profiles';
import { mapRateFieldToKey, RATES_FIELDS } from '../../actions';

const ratesReducer = (state = initialProfileStates.rates, action) => {
  let change = {};
  const nextState = JSON.parse(JSON.stringify(state));
  // If we can't map the field to a rates key or there's no value, don't change anything
  if (!mapRateFieldToKey[action.type] || !action.value) {
    return Object.assign({}, state);
  }
  switch (action.type) {
    case RATES_FIELDS.RATE:
      if (!action.value.site || !action.value.rate) {
        break;
      }
      change = nextState.find(s => s.site.url === action.value.site.value);
      change.selectedRate = action.value.rate;
      break;
    default: {
      change = {
        [mapRateFieldToKey[action.type]]:
          action.value || initialProfileStates.rates[mapRateFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }

  return nextState;
};
export default ratesReducer;
