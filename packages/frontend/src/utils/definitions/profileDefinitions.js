import locationState from './profiles/locationState';
import locationStateErrors from './profiles/locationStateErrors';
import paymentState from './profiles/paymentState';
import paymentStateErrors from './profiles/paymentStateErrors';
import shippingRate from './profiles/rates';
import profile from './profiles/profile';
import profileList from './profiles/profileList';

export default {
  locationState,
  locationStateErrors,
  paymentState,
  paymentStateErrors,
  rates: shippingRate,
  profile,
  profileList,
};
