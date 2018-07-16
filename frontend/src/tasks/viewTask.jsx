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

class ViewTask extends Component {

  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
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
      table.push((
        <tr key={this.props.tasks[i].id} id={this.props.tasks[i].id} className="tasks_row">
          <td className="blank" />
          <td className="tasks_edit"><img src={edit} onClick={() => {this.editTask(this.props.tasks[i])}} alt="edit" draggable="false"/></td>
          <td className="tasks_id">{this.props.tasks[i].id < 10 ? "0"+this.props.tasks[i].id : this.props.tasks[i].id}</td>
          <td className="tasks_sku">SKU {this.props.tasks[i].sku}</td>
          <td className="tasks_profile">{this.props.tasks[i].profile.profileName}</td>
          <td className="tasks_sizes">{this.props.tasks[i].sizes}</td>
          <td className="tasks_pairs">{this.props.tasks[i].pairs < 10 ? "0"+this.props.tasks[i].pairs : this.props.tasks[i].pairs}</td>
          <td className="tasks_start"><img src={this.props.tasks[i].status === 'running' ? startDim : start} onClick={() => {this.startTask(this.props.tasks[i])}} alt="start"  draggable="false"/></td>
          <td className="tasks_stop"><img src={this.props.tasks[i].status === 'running' ? stop : stopDim} onClick={() => {this.stopTask(this.props.tasks[i])}} alt="stop" draggable="false"/></td>
          <td className="tasks_destroy"><img src={destroy} onClick={() => {this.destroyTask(this.props.tasks[i])}} alt="destroy" draggable="false"/></td>
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
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  onEditTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
