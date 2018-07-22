import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import TaskRow from './taskRow';

import start from '../_assets/run.svg';
import startDim from '../_assets/run_dim.svg';
import stop from '../_assets/stop.svg';
import stopDim from '../_assets/stop_dim.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import { taskActions } from '../state/actions';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  editTask(task) {
    console.log('editing task: ', task.id);
    this.props.onEditTask(task);
  }

  selectTask(task) {
    console.log('selected task: ', task.id);
    this.props.onSelectTask(task);
  }

  startTask(task) {
    console.log('starting task: ', task.id);
    this.props.onStartTask(task);
  }

  stopTask(task) {
    console.log('stopping task: ', task.id);
    this.props.onStopTask(task);
  }

  destroyTask(task) {
    console.log('destroying task: ', task.id);
    this.props.onDestroyTask(task);
  }

  createTable() {
    const table = [];

    for (let i = 0; i < this.props.tasks.length; i += 1) {
      table.push((
        <TaskRow task={this.props.tasks[i]} />
      ));
    }
    return table;
  }

  render() {
    return (
      <table>
        <tbody>{this.createTable()}</tbody>
      </table>
    );
  }
}

const mapStateToProps = state => ({
  tasks: state.tasks,
  selectedTask: state.selectedTask,
});

const mapDispatchToProps = dispatch => ({
  onChange: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
  onEditTask: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
  onSelectTask: (task) => {
    dispatch(taskActions.select(task));
  },
  onUpdateTask: (task) => {
    dispatch(taskActions.update(task.id, task));
  },
  onStartTask: (task) => {
    dispatch(taskActions.start(task.id));
  },
  onStopTask: (task) => {
    dispatch(taskActions.stop(task.id));
  },
  onDestroyTask: (task) => {
    dispatch(taskActions.remove(task.id));
  },
});

ViewTask.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  onEditTask: PropTypes.func.isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
