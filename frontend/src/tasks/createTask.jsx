import React, { Component } from 'react';
import Select, { components } from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from './getSizes';

import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import './tasks.css';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

const DropdownIndicator = (props) => {
  return components.DropdownIndicator && (
    <components.DropdownIndicator {...props}>
      <img src={DDD} alt="" />
    </components.DropdownIndicator>
  );
};

const baseStyles = {
  option: (base, state) => ({
    ...base,
    background: '#f4f4f4',
    padding: 7.5,
  }),
  control: () => ({
    height: 29,
    width: 252,
  }),
  singleValue: (base, state) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return { ...base, opacity, transition };
  }
}

class CreateTask extends Component {
  static buildSizeOptions() {
    return getAllSizes();
    // const sizes = getAllSizes();
    // return sizes.map(size =>
    //   (<option key={size.name} value={size.name}>{size.name}</option>));
  }

  static openSelect(which) {
    const el = document.getElementById(which);
    console.log(el);
    el.size = 4;
  }

  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.saveTask = this.saveTask.bind(this);
  }

  buildProfileOptions() {
    const p = this.props.profiles;
    console.log(p);
    const x = [];
    p.forEach(profile => {
      x.push({ value: profile.id, label: profile.profileName })
    });

    console.log(x);
    return x;

    // return p.map(profile => (<option key={profile.id} className="opt" value={profile.id}>{profile.profileName}</option>));
  }

  async saveTask(e) {
    e.preventDefault();
    console.log(this.props.value);
    this.props.onAddNewTask(this.props.value);
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
    return (
      <div>
        <p className="body-text" id="create-label">Create</p>
        <div id="create-box" />
        <p id="sku-label">Input SKU</p>
        <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SKU)} value={this.props.value.sku} required />
        <p id="profiles-label">Billing Profiles</p>
        <Select
          required
          defaultValue="Choose a profile"
          components={{ DropdownIndicator }}
          id="profiles"
          // styles={baseStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
          value={this.props.value.profile.id || ''}
          options={this.buildProfileOptions()}
        />
        <p id="size-label">Sizes</p>
        <Select
          required
          defaultValue="Choose a profile"
          components={{ DropdownIndicator }}
          id="size"
          // styles={baseStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
          // value={this.props.value.sizes}
          options={CreateTask.buildSizeOptions()}
        />
        <p id="pairs-label"># Pairs</p>
        <input id="pairs" type="number" min="1" max="10" placeholder="00" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} value={this.props.value.pairs} required />
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
  errors: tDefns.taskErrors.isRequired,
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
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask) => {
    dispatch(taskActions.add(newTask));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);
