import React from 'react';
import PropTypes from 'prop-types';

const defaultListStyle = {
    color: '#B9220A',
    listStyle: 'none',
    paddingLeft: 0,
	marginTop: '3px',
	marginBottom: '0px',
	fontSize: '12px'
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