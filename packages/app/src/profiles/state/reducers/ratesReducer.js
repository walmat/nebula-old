import { Rates } from '../initial';
import { mapRateFieldToKey, RATES_FIELDS } from '../../../store/actions';

const ratesReducer = (state = Rates, action) => {
  const { type, value } = action;

  if (!action || !type || !mapRateFieldToKey[type]) {
    return state;
  }

  if (type === RATES_FIELDS.RATE) {
    if (!value) {
      return state;
    }

    const { site, rate } = value;

    if (!site || !rate) {
      return state;
    }

    return state.map(r => {
      if (r.site.url === site.value) {
        const newRate = r;
        newRate.selectedRate = rate;
        return newRate;
      }
      return r;
    });
  }

  return state;
};
export default ratesReducer;
