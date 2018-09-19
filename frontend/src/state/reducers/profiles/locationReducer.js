import { mapLocationFieldToKey } from '../../actions';
import { initialLocationState } from '../../../utils/definitions/profiles/locationState';

const locationReducer = (state = initialLocationState, action) => {
  let change = {};
  switch (action.type) {
    default: {
      change = {
        [mapLocationFieldToKey[action.type]]: action.value,
      };
      break;
    }
  }
  change.errors = action.errors;
  return Object.assign({}, state, change);
};
export default locationReducer;
