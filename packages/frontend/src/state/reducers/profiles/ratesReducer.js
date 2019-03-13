import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';
import { mapProfileFieldToKey } from '../../actions';

const ratesReducer = (state = initialProfileStates.rates, action) => {
  let change = {};
  // If we can't map the field to a rates key, don't change anything
  if (!mapProfileFieldToKey[action.type]) {
    return Object.assign({}, state);
  }
  switch (action.type) {
    default: {
      change = {
        [mapProfileFieldToKey[action.type]]:
          action.value || initialProfileStates.rates[mapProfileFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }

  return Object.assign({}, state, change);
};
export default ratesReducer;
