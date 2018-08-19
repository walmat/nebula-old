import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import TaskRow from './taskRow';
import { taskActions } from '../state/actions';

import defns from '../utils/definitions/taskDefinitions';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.editTask = this.editTask.bind(this);
    this.startTask = this.startTask.bind(this);
    this.stopTask = this.stopTask.bind(this);
    this.destroyTask = this.destroyTask.bind(this);
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
    const table = this.props.tasks.map(task => (<TaskRow key={task.id} task={task} />));
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

const mapStateToProps = state => ({
  tasks: state.tasks,
});

const mapDispatchToProps = dispatch => ({
  onChange: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
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
  tasks: defns.taskList.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
