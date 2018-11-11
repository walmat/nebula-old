/* eslint-disable import/prefer-default-export */
import validationStatus from '../validationStatus';

export const buildStyle = (disabled, errors) => Object.assign(
  {},
  { backgroundColor: disabled ? '#e5e5e5' : '#F5F5F5' },
  validationStatus(errors),
);
