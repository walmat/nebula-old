import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from './getSizes';

import DDD from '../_assets/dropdown-down.svg';
import start from '../_assets/run.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import './tasks.css';

const $ = require('jquery');

class CreateTask extends Component {
  static buildSizeOptions() {
    const sizes = getAllSizes();
    return sizes.map(size =>
      (<option key={size.name} value={size.name}>{size.name}</option>));
  }

  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.saveTask = this.saveTask.bind(this);
  }

  buildProfileOptions() {
    const p = this.props.profiles;
    return p.map(profile => (<option key={profile.id} className="opt" value={profile.id}>{profile.profileName}</option>));
  }

  async saveTask(e) {
    e.preventDefault();
    this.props.onAddNewTask(this.props.value);
    // move this properly
    $('#view-tasks-table').after(`<tr id="view-tasks-row-${this.props.value.id}" style="height:30px;">
      <td class="view-tasks-edit"><img src="${edit}" /></td>
      <td class="view-tasks-id">0</td>
      <td class="view-tasks-sku">${this.props.value.sku}</td>
      <td class="view-tasks-profile">${this.props.value.profile.profileName}</td>
      <td class="view-tasks-sizes">${this.props.value.sizes}</td>
      <td class="view-tasks-pairs">${this.props.value.pairs}</td>
      <td class="view-tasks-actions"><img style="padding-right: 5px;cursor:pointer;" id="task-start-${this.props.value.id}" src="${start}"/><img style="padding-right: 5px;cursor:pointer;" id="task-stop-${this.props.value.id}" src="${stop}"/><img style="cursor:pointer;" id="task-destroy-${this.props.value.id}" src="${destroy}"/></td>
    </tr>`);
  }

  createOnChangeHandler(field) {
    switch (field) {
      case TASK_FIELDS.EDIT_PROFILE:
        return (event) => {
          const change = this.props.profiles.find(p => `${p.id}` === event.target.value);
          this.props.onChange({ field, value: change });
        };
      default:
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    const { errors } = this.props;
    return (
      <div>
        <p className="body-text" id="create-label">Create</p>
        <div id="create-box" />
        <p id="sku-label">Input SKU</p>
        <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SKU)} value={this.props.value.sku} required />
        <p id="profiles-label">Billing Profiles</p>
        <select id="profiles" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)} value={this.props.value.profile.id || ''} required>
          <option value="" selected disabled hidden>Choose Profiles</option>
          {this.buildProfileOptions()}
        </select>
        <div id="dropdown-profiles-box" />
        <img src={DDD} alt="dropdown" id="dropdown-profiles-arrow" draggable="false" />
        <p id="size-label">Sizes</p>
        <select id="size" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)} value={this.props.value.sizes} required>
          <option value="" selected disabled hidden>Choose Size</option>
          {CreateTask.buildSizeOptions()}
        </select>
        <img src={DDD} alt="dropdown" id="dropdown-size-arrow" draggable="false" />
        <p id="pairs-label"># Pairs</p>
        <input id="pairs" type="text" placeholder="00" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} value={this.props.value.pairs} required />
        <button
          id="submit-tasks"
          tabIndex={0}
          onKeyPress={() => {}}
          onClick={this.saveTask}
        >
        Submit
        </button>
      </div>
    );
  }
}

CreateTask.propTypes = {
  errors: PropTypes.objectOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
  onAddNewTask: PropTypes.func.isRequired,
};


// this.state.todos.filter(filterTodo => filterTodo !== todo);
const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  value: ownProps.taskToEdit,
  errors: ownProps.taskToEdit.errors,
});

const mapDispatchToProps = dispatch => ({
  onChange: (changes) => {
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask) => {
    dispatch(taskActions.add(newTask));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);
