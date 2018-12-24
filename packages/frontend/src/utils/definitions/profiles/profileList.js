import PropTypes from 'prop-types';

import profile, { initialProfileState } from './profile';

export const initialProfileListState = [
  Object.assign(
    {},
    initialProfileState,
    JSON.parse(
      '{"id":1,"profileName":"Test Profile US","errors":{"profileName":false,"billingMatchesShipping":false},"billingMatchesShipping":true,"shipping":{"firstName":"John","lastName":"Smith","address":"8344 West Cedar Rd.","apt":"","city":"Rego Park","country":{"label":"United States","value":"US"},"state":{"value":"NY","label":"New York"},"zipCode":"11374","phone":"1234567890","errors":{"firstName":false,"lastName":false,"address":false,"apt":false,"city":false,"country":false,"state":false,"zipCode":false,"phone":false}},"billing":{"firstName":"John","lastName":"Smith","address":"8344 West Cedar Rd.","apt":"","city":"Rego Park","country":{"label":"United States","value":"US"},"state":{"value":"NY","label":"New York"},"zipCode":"11374","phone":"1234567890","errors":{"firstName":false,"lastName":false,"address":false,"apt":false,"city":false,"country":false,"state":false,"zipCode":false,"phone":false}},"payment":{"email":"test@test.com","cardNumber":"4111111111111","exp":"12/34","cvv":"123","errors":{"email":false,"cardNumber":false,"exp":false,"cvv":false}}}',
    ),
  ),
  Object.assign(
    {},
    initialProfileState,
    JSON.parse(
      '{"id":2,"profileName":"Test Profile UK","errors":{"profileName":false,"billingMatchesShipping":false},"billingMatchesShipping":true,"shipping":{"firstName":"test","lastName":"test","address":"test","apt":"test","city":"test","country":{"label":"United Kingdom","value":"UK"},"state":{"value":"","label":""},"zipCode":"12345","phone":"1234567890","errors":{"firstName":false,"lastName":false,"address":false,"apt":false,"city":false,"country":false,"state":false,"zipCode":false,"phone":false}},"billing":{"firstName":"test","lastName":"test","address":"test","apt":"test","city":"test","country":{"label":"United Kingdom","value":"UK"},"state":{"value":"","label":""},"zipCode":"12345","phone":"1234567890","errors":{"firstName":false,"lastName":false,"address":false,"apt":false,"city":false,"country":false,"state":false,"zipCode":false,"phone":false}},"payment":{"email":"test@test.com","cardNumber":"4111111111111","exp":"12/34","cvv":"123","errors":{"email":false,"cardNumber":false,"exp":false,"cvv":false}}}',
    ),
  ),
];

const profileList = PropTypes.arrayOf(profile);

export default profileList;
