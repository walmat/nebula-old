/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';

const AmountField = ({ amount, onChange }) => (
  <div className="col col--expand col--no-gutter">
    <input
      type="number"
      className="tasks--create__amount"
      onChange={e => onChange(e.target.value)}
      value={amount}
      style={buildStyle(false, null)}
      tabIndex={0}
      onKeyPress={() => {}}
    />
  </div>
);

AmountField.propTypes = {
  onChange: PropTypes.func.isRequired,
  amount: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  amount: makeCurrentTask(state).amount,
});

export const mapDispatchToProps = dispatch => ({
  onChange: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_AMOUNT, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AmountField);
