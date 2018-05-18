import React from 'react';
import PropTypes from 'prop-types';
import valid from '../_assets/Symbol_check-01.png';
import invalid from '../_assets/Symbol_check-02.png';

const errorStyle = {
    backgroundImage: `url(${invalid})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right center',
    backgroundOrigin: 'content-box',
    backgroundSize: '15px 15px'
};

const validStyle = {
    backgroundImage: `url(${valid})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right center',
    backgroundOrigin: 'content-box',
    backgroundSize: '15px 15px',
}

function validationStatus(validationErrors) {
    return validationErrors ? errorStyle : validStyle;
}

validationStatus.propTypes = {
    errors: PropTypes.arrayOf(PropTypes.string)
};

export default validationStatus;