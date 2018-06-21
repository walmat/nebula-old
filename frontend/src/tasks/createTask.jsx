import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {TASK_FIELDS, taskActions} from '../state/actions';
import getAllSizes from './getSizes';
import getAllProfiles from './getProfiles';

import DDD from '../_assets/dropdown-down.svg';
import './tasks.css';

class CreateTask extends Component {

  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
  }


  static buildSizeOptions() {
    const sizes = getAllSizes();
    return sizes.map(size =>
      (<option key={size.name} value={size.name}>{size.name}</option>));
  }

  buildProfileOptions = () => {
    const profiles = this.props.profiles;

    console.log(this.props.profiles);
    return profiles.map(profile =>
      (<option key={profile.profileName} value={profile.profileName}>{profile.profileName}</option>));
  };

  static async saveTask(e) {
      e.preventDefault();

      if (this.props.currentTask.editId !== undefined) {

          // make sure the profile id exists in profiles before call in the load
          if (this.props.tasks.some(t => t.id === this.props.currentTask.editId)) {
              // The current profile has the same id as a profile
              // in the profiles list, update that profile
              this.props.onUpdateTask(this.props.currentTask);
          } else {
              // The current profile has an edit id, but it doesn't match
              // any on the profiles list, add this as a new profile.
              this.props.onAddNewTask(this.props.currentTask);
          }
      } else {
          // No edit id tag exists, add this as a new profile.
          this.props.onAddNewTask(this.props.currentTask);
      }
  };

  createOnChangeHandler(field) {
    return (event) => {
      this.props.onChange({ field, value: event.target.value });
    };
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
        <select id="profiles" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_BILLING)} value={this.props.profiles.profileName} required>
          <option value="" selected disabled hidden>Choose Profiles</option>
          {this.buildProfileOptions()}
        </select>
        <div id="dropdown-profiles-box" />
        <img src={DDD} alt="dropdown" id="dropdown-profiles-arrow" draggable="false" />
        <p id="size-label">Sizes</p>
        <select id="size" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)} value={this.props.value.size} required>
          <option value="" selected disabled hidden>Choose Size</option>
          {CreateTask.buildSizeOptions()}
        </select>
        <img src={DDD} alt="dropdown" id="dropdown-size-arrow" draggable="false" />
        <p id="pairs-label"># Pairs</p>
        <input id="pairs" type="text" placeholder="00" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} required />
        <button id="submit-tasks"
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.props.saveTask}>
            Submit
        </button>
      </div>
    );
  }
}

CreateTask.propTypes = {
  errors: PropTypes.objectOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => {
    console.log(state);
    console.log(ownProps);
    return {
        profiles: state.profiles,
        value: ownProps.taskToEdit,
        errors: ownProps.taskToEdit.errors
    }
};

const mapDispatchToProps = (dispatch) => ({
    onChange: (changes) => {
        dispatch(taskActions.edit(null, changes.field, changes.value));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);
