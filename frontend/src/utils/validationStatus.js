import PropTypes from 'prop-types';
import valid from '../_assets/Symbol_check-01.png';
// import unknown from '../_assets/Empty_icons-03.svg';
import invalid from '../_assets/Symbol_check-02.png';

const errorStyle = {
  borderColor: '#EF415E',
  // backgroundImage: `url(${invalid})`,
  // backgroundRepeat: 'no-repeat',
  // backgroundPosition: 'right center',
  // backgroundOrigin: 'content-box',
  // backgroundSize: '15px 15px',
};

const neutralStyle = {
  borderColor: '#6D6E70',
};

const validStyle = {
  borderColor: '#46ADB4',
  // backgroundImage: `url(${valid})`,
  // backgroundRepeat: 'no-repeat',
  // backgroundPosition: 'right center',
  // backgroundOrigin: 'content-box',
  // backgroundSize: '15px 15px',
};

function validationStatus(validationErrors) {
  return validationErrors ? errorStyle : validStyle;
}

validationStatus.propTypes = {
  validationErrors: PropTypes.bool,
};

export default validationStatus;
