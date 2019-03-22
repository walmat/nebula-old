import initialProfileStates from '../../initial/profiles';
import { mapRateFieldToKey, RATES_FIELDS } from '../../actions';

const ratesReducer = (state = initialProfileStates.rates, action) => {
  const nextState = JSON.parse(JSON.stringify(state));
  // If we can't map the field to a rates key or there's no type or value, don't change anything
  if (!action || !action.type || !mapRateFieldToKey[action.type]) {
    return nextState;
  }
  switch (action.type) {
    case RATES_FIELDS.RATE: {
      if (!action.value.site || !action.value.rate) {
        break;
      }
      const rateObjectForSite = nextState.find(s => s.site.url === action.value.site.value);
      if (!rateObjectForSite) {
        break;
      }
      const idx = nextState.indexOf(rateObjectForSite);
      nextState[idx].selectedRate = action.value.rate;
      break;
    }
    default: {
      nextState[[mapRateFieldToKey[action.type]]] =
        action.value || initialProfileStates.rates[mapRateFieldToKey[action.type]];
      break;
    }
  }
  return nextState;
};
export default ratesReducer;
