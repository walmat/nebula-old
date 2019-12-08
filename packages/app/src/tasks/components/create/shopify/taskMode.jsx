/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

const TaskMode = ({ type, onToggle }) => (
  <div className="col col--start col--expand col--no-gutter-right">
    <p
      className={`create-tasks__input--${type}`}
      onKeyPress={() => {}}
      onClick={() => onToggle(type)}
    >
      {type}
    </p>
  </div>
);

TaskMode.propTypes = {
  onToggle: PropTypes.func.isRequired,
  type: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  type: makeCurrentTask(state).type,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: type => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_TASK_TYPE, type));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskMode);
