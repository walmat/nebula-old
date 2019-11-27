import initialProfileStates from '../../initial/profiles';
import { mapRateFieldToKey, RATES_FIELDS } from '../../actions';

const ratesReducer = (state = initialProfileStates.rates, action) => {

  console.log('rates reducer handling action: ', action);

  const nextState = JSON.parse(JSON.stringify(state));
  // If we can't map the field to a rates key or there's no type or value, don't change anything
  if (!action || !action.type || !mapRateFieldToKey[action.type]) {
    return nextState;
  }
  switch (action.type) {
    case RATES_FIELDS.RATE: {
      if (!action.value || !action.value.site || !action.value.rate) {
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
    default:
      break;
  }
  return nextState;
};
export default ratesReducer;
