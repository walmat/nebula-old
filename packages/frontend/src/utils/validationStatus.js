import PropTypes from 'prop-types';

const errorStyle = {
  borderColor: '#EF415E',
};

/**
 * Add this in a future PR
 */
// const neutralStyle = {
//   borderColor: '#6D6E70',
// };

const validStyle = {
  borderColor: '#46ADB4',
};

function validationStatus(validationErrors) {
  return validationErrors ? errorStyle : validStyle;
}

validationStatus.propTypes = {
  validationErrors: PropTypes.bool,
};

export default validationStatus;
