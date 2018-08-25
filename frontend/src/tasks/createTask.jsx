import React, { Component } from 'react';
import { Creatable } from 'react-select';
import NumberFormat from 'react-number-format';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from '../getSizes';

import './tasks.css';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';

class CreateTask extends Component {
  static buildSizeOptions() {
    return getAllSizes();
  }
  
  static formatPairs(val) {
    if (val.length === 0) {
      return 1;
    }
    return val <= 5 && val > 0 ? val : null;
  }

  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.saveTask = this.saveTask.bind(this);
  }

  buildProfileOptions() {
    const p = this.props.profiles;
    return p.map(profile => ({ value: profile.id, label: profile.profileName }));
  }

  async saveTask(e) {
    e.preventDefault();
    console.log(this.props.val)
    this.props.onAddNewTask(this.props.val);
  }
  createOnChangeHandler(field) {
    switch (field) {
      case TASK_FIELDS.EDIT_PROFILE:
        return (event) => {
          const change = this.props.profiles.find(p => p.id === event.value);
          this.props.onChange({ field, value: change });
        };
      case TASK_FIELDS.EDIT_SIZES:
        return (event) => {
          const values = event.map(s => s.value);
          this.props.onChange({ field, value: values });
        };
      case TASK_FIELDS.EDIT_SKU:
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        };
      case TASK_FIELDS.EDIT_PAIRS:
        return (event) => {
          // // prevent zero input when backspacing
          // if (event.target.value === 0 || event.target.value === null || event.target.value === undefined || event.target.value === '') {
          //   event.target.value = 1;
          // }
          this.props.onChange({ field, value: event.target.value });
        };
      default:
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    return (
      <div>
        <p className="body-text" id="create-label">Create</p>
        <div id="create-box" />
        <p id="sku-label">Input SKU</p>
        <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SKU)} value={this.props.value.sku} required />
        <p id="profiles-label">Billing Profiles</p>
        <Creatable
          required
          onSelectResetsInput="true"
          components={{ DropdownIndicator }}
          id="profiles"
          classNamePrefix="select"
          styles={colourStyles}
          placeholder="Choose Profile"
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
          value={this.props.value.profile.profileName.value}
          options={this.buildProfileOptions()}
        />
        <p id="size-label">Sizes</p>
        <Creatable
          required
          isMulti
          className="Select-control"
          classNamePrefix="select"
          placeholder="Choose Profile"
          isClearable={false}
          components={{ DropdownIndicator }}
          id="size"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
          value={this.props.value.sizes.value}
          options={CreateTask.buildSizeOptions()}
        />
        <p id="pairs-label"># Pairs</p>
        <NumberFormat format={CreateTask.formatPairs} placeholder="1" value={this.props.value.pairs} id="pairs" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} />
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
  // errors: tDefns.taskErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  value: tDefns.task.isRequired,
  onAddNewTask: PropTypes.func.isRequired,
};


const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  value: ownProps.taskToEdit,
  errors: ownProps.taskToEdit.errors,
});

const mapDispatchToProps = dispatch => ({
  onChange: (changes) => {
    console.log(changes);
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask) => {
    dispatch(taskActions.add(newTask));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);
