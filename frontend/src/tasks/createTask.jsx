import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from './getSizes';
import getAllProfiles from './getProfiles';

import DDD from '../_assets/dropdown-down.svg';
// import DDU from '../_assets/dropdown-up.svg';
import './tasks.css';

class CreateTask extends Component {
  static buildSizeOptions() {
    const sizes = getAllSizes();
    return sizes.map(size =>
      (<option key={size.name} value={size.name}>{size.name}</option>));
  }

  static buildProfileOptions() {
    const billings = getAllProfiles();
    return billings.map(profile =>
      (<option key={profile.name} value={profile.name}>{profile.name}</option>));
  }

  createOnChangeHandler(field) {
    return (event) => {
      this.props.onChange({ field, value: event.target.value });
    };
  }

  render() {
    return (
      <div>
        <p className="body-text" id="create-label">Create</p>
        <div id="create-box" />
        <p id="sku-label">Input SKU</p>
        <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SKU)} value={this.props.value.sku} required />
        <p id="profiles-label">Billing Profiles</p>
        <select id="profiles" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_BILLING)} value={this.props.value.billingProfile} required>
          <option value="" selected disabled hidden>Choose Profiles</option>
          {CreateTask.buildProfileOptions()}
        </select>
        <div id="dropdown-profiles-box" />
        <img src={DDD} alt="dropdown" id="dropdown-profiles-arrow" draggable="false" />
        <p id="size-label">Sizes</p>
        <select id="size" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)} required>
          <option value="" selected disabled hidden>Choose Size</option>
          {CreateTask.buildSizeOptions()}
        </select>
        <img src={DDD} alt="dropdown" id="dropdown-size-arrow" draggable="false" />
        <p id="pairs-label"># Pairs</p>
        <input id="pairs" type="text" placeholder="00" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} required />
        <button id="submit-tasks">Submit</button>
      </div>
    );
  }
}

CreateTask.propTypes = {
  // errors: PropTypes.objectOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  errors: state.currentTask.errors,
  value: state.currentTask,
});

const mapDispatchToProps = dispatch => ({
  onChange: (changes) => {
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);
