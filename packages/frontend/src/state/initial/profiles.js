import { initialState } from '../migrators';

const { selectedProfile: profile, profiles: list } = initialState;
const { billing: location, payment } = profile;

export default {
  location,
  locationErrors: location.errors,
  payment,
  paymentErrors: payment.errors,
  profile,
  list,
};
