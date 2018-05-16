import React from 'react';
import PropTypes from 'prop-types';

const defaultListStyle = {
    backgroundImage: 'url(../_assets/Symbol_check-02.png)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right center',
    backgroundOrigin: 'content-box'
};

function ValidationErrors(props) {
    if (props.errors && props.errors.length > 0) {
        return (
            <ul className='validation-error-list' style={defaultListStyle}>
                {props.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
        );
    }
    return false;
}

ValidationErrors.propTypes = {
    errors: PropTypes.arrayOf(PropTypes.string)
};

export default ValidationErrors;