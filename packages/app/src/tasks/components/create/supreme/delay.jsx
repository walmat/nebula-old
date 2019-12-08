/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';

const CheckoutDelayField = ({ checkoutDelay, onChange }) => (
  <div className="col col--expand col--no-gutter-right">
    <p className="tasks--create__label">Delay</p>
    <input
      type="number"
      placeholder="0"
      className="tasks--create__input tasks--create__input--bordered tasks--create__input--checkout-delay"
      onChange={e => onChange(e.target.value)}
      value={checkoutDelay}
      style={buildStyle(false, null)}
      tabIndex={0}
      onKeyPress={() => {}}
    />
  </div>
);

CheckoutDelayField.propTypes = {
  onChange: PropTypes.func.isRequired,
  checkoutDelay: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  checkoutDelay: makeCurrentTask(state).checkoutDelay,
});

export const mapDispatchToProps = dispatch => ({
  onChange: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_CHECKOUT_DELAY, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CheckoutDelayField);
