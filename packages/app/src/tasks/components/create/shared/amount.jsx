/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';
import { makeTheme } from '../../../../app/state/selectors';

const AmountField = ({ theme, amount, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-right">
    <input
      type="number"
      className={`create-tasks__amount--${theme}`}
      onChange={e => onChange(e.target.value)}
      value={amount}
      style={buildStyle(false, null)}
      tabIndex={0}
      onKeyPress={() => {}}
    />
  </div>
);

AmountField.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  amount: PropTypes.number.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  amount: makeCurrentTask(state).amount,
});

export const mapDispatchToProps = dispatch => ({
  onChange: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_AMOUNT, value));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(AmountField);
