/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

const AmountField = ({ task, onCreate }) => (
  <div className="col col--start col--expand">
    <button
      type="button"
      className="create-tasks__submit"
      tabIndex={0}
      onKeyPress={() => {}}
      onClick={() => onCreate(task)}
    >
      Submit
    </button>
  </div>
);

AmountField.propTypes = {
  onCreate: PropTypes.func.isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  task: makeCurrentTask(state),
});

export const mapDispatchToProps = dispatch => ({
  onCreate: task => {
    dispatch(taskActions.create(task));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(AmountField);
