import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import getAllSizes from '../getSizes';

import start from '../_assets/run.svg';
import startDim from '../_assets/run_dim.svg';
import stop from '../_assets/stop.svg';
import stopDim from '../_assets/stop_dim.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import { taskActions } from '../state/actions';

class TaskRow extends Component {

  static buildSizeOptions() {
    const sizes = getAllSizes();
    return sizes.map(size =>
      (<option key={size.name} value={size.name}>{size.name}</option>));
  }

  selectTask(task) {
    console.log('selected task: ', this.props.selectedTask.id);
    console.log('passed in: ', task.id);
    if (this.props.selectedTask.id !== task.id) {
      this.props.onSelectTask(task);
    } else {
      // deselect current task (or toggle it)
      this.props.onSelectTask(null);
    }
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

  buildProfileOptions() {
    const p = this.props.profiles;
    return p.map(profile => (<option key={profile.id} className="opt" value={profile.id}>{profile.profileName}</option>));
  }

  renderEditMenu() {
    if (this.props.isEditing) {
      return (
        <div key={`${this.props.value.id}-edit`} className="tasks-row tasks-row--edit">
          {/*<div id="edit-box"> */}
          <div className="edit-billing">
            <p className="edit-billing__label">Billing Profiles</p>
            <select className="edit-billing__select">
              <option value="" selected disabled hidden>Choose Profile</option>
              {this.buildProfileOptions()}
            </select>
          </div>
          <div className="edit-sizes">
            <p className="edit-sizes__label">Sizes</p>
            <select className="edit-sizes__select">
              <option value="" selected disabled hidden>Choose Sizes</option>
              {TaskRow.buildSizeOptions()}
            </select>
          </div>
          <div className="edit-pairs extend">
            <p className="edit-pairs__label"># Pairs</p>
            <input className="edit-pairs__input" type="number" min="1" max="10" maxLength="2" size="2" placeholder="00" required />
            <div className="submit-edit">
              <button
                className="submit-edit__button"
                tabIndex={0}
                onKeyPress={() => {}}
                onClick={this.saveTask}
              >
                Save
              </button>
            </div>
          </div>
          {/* </div> */}
        </div>
      );
    }
    return null;
  }

  renderTableRow() {
    return (
      <div key={this.props.value.id} id={this.props.value.id} className="tasks-row">
        <div className="tasks-edit pad-left"><img src={edit} onKeyPress={() => {}} onClick={() => { this.selectTask(this.props.value); }} alt="edit" draggable="false" className={this.props.value.status === 'editing' ? 'active' : ''} /></div>
        <div className="tasks-id">{this.props.value.id < 10 ? `0${this.props.value.id}` : this.props.value.id}</div>
        <div className="tasks-sku">SKU {this.props.value.sku}</div>
        <div className="tasks-sites">01</div>
        <div className="tasks-profile">{this.props.value.profile.profileName}</div>
        <div className="tasks-sizes">{this.props.value.sizes}</div>
        <div className="tasks-pairs">{this.props.value.pairs < 10 ? `0${this.props.value.pairs}` : this.props.value.pairs}</div>
        <div className="tasks-start"><img src={this.props.value.status === 'running' ? startDim : start} onKeyPress={() => {}} onClick={() => { this.startTask(this.props.value); }} alt="start" draggable="false" className={this.props.value.status === 'running' ? 'active' : ''} /></div>
        <div className="tasks-stop"><img src={this.props.value.status === 'running' ? stop : stopDim} onKeyPress={() => {}} onClick={() => { this.stopTask(this.props.value); }} alt="stop" draggable="false" className={this.props.value.status === 'stopped' ? 'active' : ''} /></div>
        <div className="tasks-destroy"><img src={destroy} onKeyPress={() => {}} onClick={() => { this.destroyTask(this.props.value); }} alt="destroy" draggable="false" /></div>
        <div className="extend" />
      </div>
    );
  }

  render() {
    return (
      <div className="tasks-row-container">
        { this.renderTableRow() }
        { this.renderEditMenu() }
      </div>
    );
  }
}

TaskRow.propTypes = {
  errors: PropTypes.objectOf(PropTypes.any).isRequired,
  isEditing: PropTypes.bool.isRequired,
  selectedTask: PropTypes.objectOf(PropTypes.any).isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  // onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelectTask: PropTypes.func.isRequired,
  // onEditTask: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  errors: ownProps.task.errors,
  value: ownProps.task,
  selectedTask: state.selectedTask,
  isEditing: ownProps.task.id === state.selectedTask.id,
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
