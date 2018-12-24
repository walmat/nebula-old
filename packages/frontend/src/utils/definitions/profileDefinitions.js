import locationState, { initialLocationState } from './profiles/locationState';
import locationStateErrors, { initialLocationErrorState } from './profiles/locationStateErrors';
import paymentState, { initialPaymentState } from './profiles/paymentState';
import paymentStateErrors, { initialPaymentErrorState } from './profiles/paymentStateErrors';
import profile, { initialProfileState } from './profiles/profile';
import profileList, { initialProfileListState } from './profiles/profileList';

export const initialProfileStates = {
  location: initialLocationState,
  locationErrors: initialLocationErrorState,
  payment: initialPaymentState,
  paymentErrors: initialPaymentErrorState,
  profile: initialProfileState,
  list: initialProfileListState,
};

export default {
  locationState,
  locationStateErrors,
  paymentState,
  paymentStateErrors,
  profile,
  profileList,
};
