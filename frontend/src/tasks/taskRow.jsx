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

class TaskRow extends Component {

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

  render() {
    const { errors } = this.props;
    return (
      <tr key={this.props.value.id} id={this.props.value.id} className="tasks_row">
        <td className="blank" />
        <td className="tasks_edit"><img src={edit} onKeyPress={() => {}} onClick={() => { this.selectTask(this.props.value); }} alt="edit" draggable="false" className={this.props.value.status === 'editing' ? 'active' : ''} /></td>
        <td className="tasks_id">{this.props.value.id < 10 ? `0${this.props.value.id}` : this.props.value.id}</td>
        <td className="tasks_sku">SKU {this.props.value.sku}</td>
        <td className="tasks_profile">{this.props.value.profile.profileName}</td>
        <td className="tasks_sizes">{this.props.value.sizes}</td>
        <td className="tasks_pairs">{this.props.value.pairs < 10 ? `0${this.props.value.pairs}` : this.props.value.pairs}</td>
        <td className="tasks_start"><img src={this.props.value.status === 'running' ? startDim : start} onKeyPress={() => {}} onClick={() => { this.startTask(this.props.value); }} alt="start" draggable="false" className={this.props.value.status === 'running' ? 'active' : ''} /></td>
        <td className="tasks_stop"><img src={this.props.value.status === 'running' ? stop : stopDim} onKeyPress={() => {}} onClick={() => { this.stopTask(this.props.value); }} alt="stop" draggable="false" className={this.props.value.status === 'stopped' ? 'active' : ''} /></td>
        <td className="tasks_destroy"><img src={destroy} onKeyPress={() => {}} onClick={() => { this.destroyTask(this.props.value); }} alt="destroy" draggable="false" /></td>
        <td className="extend" />
      </tr>
    );
  }
}

TaskRow.propTypes = {
  errors: PropTypes.objectOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  errors: ownProps.task.errors,
  value: ownProps.task,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes) => {
    dispatch(taskActions.edit(ownProps.task.id, changes.field, changes.value));
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


export default connect(mapStateToProps, mapDispatchToProps)(TaskRow);
