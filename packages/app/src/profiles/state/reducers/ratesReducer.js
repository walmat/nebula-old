import { Rates } from '../initial';
import { mapRateFieldToKey, RATES_FIELDS } from '../../../store/actions';

const ratesReducer = (state = Rates, action = {}) => {
  const { type, value } = action;

  if (!action || !type || !mapRateFieldToKey[type]) {
    return state;
  }

  if (type === RATES_FIELDS.RATE) {
    if (!value) {
      return state;
    }

    const { store, rate } = value;

    if (!store || !rate) {
      return state;
    }

    return state.map(r => {
      if (r.store.url === store.value) {
        return {
          ...r,
          selectedRate: rate,
        };
      }
      return r;
    });
  }

  return state;
};
export default ratesReducer;
