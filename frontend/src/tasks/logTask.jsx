import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import LogTaskRow from './logTaskRow';
import { taskActions } from '../state/actions';
import tDefns from '../utils/definitions/taskDefinitions';

export class LogTaskPrimitive extends Component {

  createTable() {
    const runningTasks = this.props.tasks.filter(task => task.status === 'running');
    const table = runningTasks.map(t => (<LogTaskRow task={t} />));
    return table;
  }

  render() {
    return (
      <div className="tasks-table">
        {this.createTable()}
      </div>
    );
  }
}

LogTaskPrimitive.propTypes = {
  tasks: tDefns.taskList.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks,
});

export const mapDispatchToProps = dispatch => ({
  onChangeStatus: (task, message) => {
    dispatch(taskActions.status(task, message));
  },
});

export default connect(mapStateToProps)(LogTaskPrimitive);
