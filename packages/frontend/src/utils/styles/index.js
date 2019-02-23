/* eslint-disable import/prefer-default-export */
import validationStatus from '../validationStatus';

export const buildStyle = (disabled, errors) => Object.assign({}, validationStatus(errors));
