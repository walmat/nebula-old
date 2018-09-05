import React, { Component } from 'react';
import Select from 'react-select';
import NumberFormat from 'react-number-format';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from '../getSizes';
import getAllSites from '../getSites';

import './tasks.css';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';

class CreateTask extends Component {
  static buildSizeOptions() {
    return getAllSizes();
  }

  static buildSiteOptions() {
    return getAllSites();
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

  saveTask(e) {
    e.preventDefault();
    this.props.onAddNewTask(this.props.value);
  }
  createOnChangeHandler(field) {
    switch (field) {
      case TASK_FIELDS.EDIT_SITE:
        return (event) => {
          this.props.onChange({ field, value: event });
        };
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
      case TASK_FIELDS.EDIT_PAIRS:
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        };
      default:
      // should never be called, but nice to have just in case
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    let newTaskProfileValue = null;
    if (this.props.value.profile.id !== null) {
      newTaskProfileValue = {
        value: this.props.value.profile.id,
        label: this.props.value.profile.profileName,
      };
    }
    return (
      <div>
        <p className="body-text" id="create-label">Create</p>
        <div id="create-box" />
        <p id="product-label">Product</p>
        <input
          id="product"
          type="text"
          placeholder="SKU, Keywords, Link"
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT)}
          value={this.props.value.sku}
          required
        />
        <p id="site-label">Site</p>
        <Select
          required
          classNamePrefix="select"
          placeholder="Choose Site"
          components={{ DropdownIndicator }}
          id="sites"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
          value={this.props.value.site}
          options={CreateTask.buildSiteOptions()}
        />
        <p id="profiles-label">Billing Profiles</p>
        <Select
          required
          classNamePrefix="select"
          placeholder="Choose Profile"
          components={{ DropdownIndicator }}
          id="profiles"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
          value={newTaskProfileValue}
          options={this.buildProfileOptions()}
        />
        <p id="size-label">Sizes</p>
        <Select
          required
          isMulti
          classNamePrefix="select"
          placeholder="Choose Sizes"
          isClearable={false}
          components={{ DropdownIndicator }}
          id="size"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
          value={this.props.value.sizes.map(size => ({ value: size, label: `${size}` }))}
          options={CreateTask.buildSizeOptions()}
        />
        <p id="pairs-label"># Pairs</p>
        <NumberFormat
          format={CreateTask.formatPairs}
          placeholder="1"
          value={this.props.value.pairs}
          id="pairs"
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)}
        />
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
