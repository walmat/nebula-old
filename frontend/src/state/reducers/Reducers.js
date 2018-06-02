/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { combineReducers } from 'redux'
import { locationReducer } from './profiles/ProfileReducer';

const topLevelReducer = (state = initialState, action) => {
  return {
    currentProfile: {
      shipping: locationReducer(state, action)
    }
  }
}

export default topLevelReducer;

/**
 * Application State
 */
const initialState = {
  profiles: [],
  selectedProfile: {
    id: 0,
    profileName: '',
    errors: {},
    billingMatchesShipping: false,
    shipping: {
        firstName: '',
        lastName: '',
        address: '',
        apt: '',
        city: '',
        country: 'United States',
        state: '',
        zipCode: '',
        phone: ''
    },
    billing: {
        firstName: '',
        lastName: '',
        address: '',
        apt: '',
        city: '',
        country: 'United States',
        state: '',
        zipCode: '',
        phone: ''
    },
    payment: {
        email: '',
        cardNumber: '',
        exp: '',
        cvv: ''
    }
  },
  currentProfile: {
    id: 0,
    profileName: '',
    errors: {},
    shippingMatchesBilling: false,
    shipping: {
        firstName: '',
        lastName: '',
        address: '',
        apt: '',
        city: '',
        country: 'United States',
        state: '',
        zipCode: '',
        phone: ''
    },
    billing: {
        firstName: '',
        lastName: '',
        address: '',
        apt: '',
        city: '',
        country: 'United States',
        state: '',
        zipCode: '',
        phone: ''
    },
    payment: {
        email: '',
        cardNumber: '',
        exp: '',
        cvv: ''
    }
  }
};
