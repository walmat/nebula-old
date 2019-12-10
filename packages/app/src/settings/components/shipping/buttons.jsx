import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeShipping } from '../../state/selectors';
import { settingsActions } from '../../../store/actions';

const Button = ({ type, disabled, label, onClick }) => (
  <button
    type="button"
    className={`settings--shipping-manager__input-group--${type}`}
    tabIndex={0}
    onKeyPress={() => {}}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
);

Button.propTypes = {
  type: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const ShippingButtons = ({ shipping, onFetch, onClear, onStop }) => (
  <>
    <div className="col col--end col--no-gutter">
      <Button
        type="fetch"
        disabled={shipping.status === 'inprogress'}
        label="Fetch"
        onClick={() => onFetch(shipping)}
      />
    </div>
    <div className="col col--end col--gutter-left">
      <Button
        type="clear"
        disabled={false}
        label={shipping.status === 'inprogress' ? 'Cancel' : 'Clear'}
        onClick={shipping.status === 'inprogress' ? () => onStop() : () => onClear()}
      />
    </div>
  </>
);

ShippingButtons.propTypes = {
  shipping: PropTypes.objectOf(PropTypes.any).isRequired,
  onFetch: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  shipping: makeShipping(state),
});

const mapDispatchToProps = dispatch => ({
  onFetch: shipping => {
    dispatch(settingsActions.fetchShipping(shipping));
  },
  onClear: () => {
    dispatch(settingsActions.clearShipping());
  },
  onStop: () => {
    dispatch(settingsActions.stopShipping());
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingButtons);
