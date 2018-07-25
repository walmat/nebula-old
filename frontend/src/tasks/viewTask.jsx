import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import startDim from '../_assets/run_dim.svg';
import stop from '../_assets/stop.svg';
import stopDim from '../_assets/stop_dim.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
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

  editTask(task) {
    console.log('editing task: ', task.id);
    this.props.onEditTask(task);
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
      const task = this.props.tasks[i];
      table.push((
        <tr key={task.id} id={task.id} className="tasks_row">
          <td className="blank" />
          <td className="tasks_edit">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => this.editTask(task)}>
              <img src={edit} alt="edit" draggable="false" />
            </div>
          </td>
          <td className="tasks_id">{task.id < 10 ? `0${task.id}` : task.id}</td>
          <td className="tasks_sku">SKU {task.sku}</td>
          <td className="tasks_profile">{task.profile.profileName}</td>
          <td className="tasks_sizes">{task.sizes}</td>
          <td className="tasks_pairs">{task.pairs}</td>
          <td className="tasks_start">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => this.startTask(task)}>
              <img src={task.status === 'running' ? startDim : start} alt="start" draggable="false" />
            </div>
          </td>
          <td className="tasks_stop">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => this.stopTask(task)}>
              <img src={task.status === 'running' ? stop : stopDim} alt="stop" draggable="false" />
            </div>
          </td>
          <td className="tasks_destroy">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => this.destroyTask(task)}>
              <img src={destroy} alt="destroy" draggable="false" />
            </div>
          </td>
          <td className="extend" />
        </tr>
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
});

const mapDispatchToProps = dispatch => ({
  onChange: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
  onEditTask: (task) => {
    dispatch(taskActions.edit(task));
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
