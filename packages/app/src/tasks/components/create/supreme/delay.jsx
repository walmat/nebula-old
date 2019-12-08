/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';
import { makeTheme } from '../../../../app/state/selectors';

const CheckoutDelayField = ({ theme, checkoutDelay, onChange }) => (
  <div className="col col--start col--expand" style={{ flexGrow: 0, maxWidth: 60 }}>
    <p className={`create-tasks__label--${theme}`}>Delay</p>
    <input
      type="number"
      placeholder="0"
      className={`create-tasks__input--${theme}`}
      onChange={e => onChange(e.target.value)}
      value={checkoutDelay}
      style={buildStyle(false, null)}
      tabIndex={0}
      onKeyPress={() => {}}
    />
  </div>
);

CheckoutDelayField.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  checkoutDelay: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
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
