import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import line from '../_assets/horizontal-line.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import { taskActions } from '../state/actions';

class ViewTask extends Component {

  static editTask(task) {
    console.log('editing task: ', task.id);
    console.log(this.props);
    this.props.onEditTask(task);
  }

  static startTask(task) {
    console.log('starting task: ', task.id);
    this.props.onStartTask(task);
  }

  static stopTask(task) {
    console.log('stopping task: ', task.id);
    this.props.onStopTask(task);
  }

  static destroyTask(task) {
    console.log('destroying task: ', task.id);
    this.props.onDestroyTask(task);
  }

  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const table = [];

    for (let i = 0; i < this.props.tasks.length; i += 1) {
      table.push((
        <tr key={this.props.tasks[i].id} id={this.props.tasks[i].id} className="tasks_row">
          <td className="blank" />
          <td className="tasks_edit"><img src={edit} onClick={() => {ViewTask.editTask(this.props.tasks[i])}} alt="edit" draggable="false"/></td>
          <td className="tasks_id">{this.props.tasks[i].id < 10 ? "0"+this.props.tasks[i].id : this.props.tasks[i].id}</td>
          <td className="tasks_sku">SKU {this.props.tasks[i].sku}</td>
          <td className="tasks_profile">{this.props.tasks[i].profile.profileName}</td>
          <td className="tasks_sizes">{this.props.tasks[i].sizes}</td>
          <td className="tasks_pairs">{this.props.tasks[i].pairs < 10 ? "0"+this.props.tasks[i].pairs : this.props.tasks[i].pairs}</td>
          <td className="tasks_start"><img src={start} onClick={() => {ViewTask.startTask(this.props.tasks[i])}} alt="start"  draggable="false"/></td>
          <td className="tasks_stop"><img src={stop} onClick={() => {ViewTask.stopTask(this.props.tasks[i])}} alt="stop" draggable="false"/></td>
          <td className="tasks_destroy"><img src={destroy} onClick={() => {ViewTask.destroyTask(this.props.tasks[i])}} alt="destroy" draggable="false"/></td>
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
  onEditTask: (task) => {
    dispatch(taskActions.edit(task));
  },
  onStartTask: (task) => {
    dispatch(taskActions.start(task));
  },
  onStopTask: (task) => {
    dispatch(taskActions.stop(task));
  },
  onDestroyTask: (task) => {
    dispatch(taskActions.destroy(task));
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
