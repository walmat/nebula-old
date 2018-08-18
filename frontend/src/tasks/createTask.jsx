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

// change this based on whether it's open or not {{toggle between DDU & DDD}}
const DropdownIndicator = (props) => {
  return components.DropdownIndicator && (
    <components.DropdownIndicator {...props}>
      <img src={props.menuIsOpen ? DDU : DDD} alt="" />
    </components.DropdownIndicator>
  );
};

const colourStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: '#f4f4f4',
    height: '29px',
    minHeight: '29px',
    border: '1px solid #F0405E',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    boxShadow: 'none',
  }),
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isFocused ? '#f4f4f4' : isDisabled ? '#ccc' : isSelected ? '#ccc' : '#fff',
      color: '#161318',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: 'none',
    };
  },
  DropdownIndicator: (styles, { menuIsOpen }) => {
    return {
      ...styles,
      marginRight: '-5px',
      src: menuIsOpen ? DDU : DDD,
    };
  },
  // input: styles => ({ ...styles, ...dot() }),
  // placeholder: styles => ({ ...styles, ...dot() }),
  // singleValue: (styles, { data }) => ({ ...styles, ...dot('#f4f4f4') }),
};

class CreateTask extends Component {
  static buildSizeOptions() {
    return getAllSizes();
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
    this.state = {
      menuIsOpen: false,
    };
  }

  buildProfileOptions() {
    const p = this.props.profiles;
    const opts = [];
    p.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName })
    });
    return opts;
    // return p.map(profile => (<option key={profile.id} className="opt" value={profile.id}>{profile.profileName}</option>));
  }

  async saveTask(e) {
    e.preventDefault();
    this.props.onAddNewTask(this.props.value);
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
        // change this to fit an array later
        this.props.onChange({ field, value: event[0].value });
      };
      case TASK_FIELDS.EDIT_SKU:
        return (event) => {
          this.props.onChange({ field, value: event.target.value });
        }
      default:
        return (event) => {
          this.props.onChange({ field, value: event.value });
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
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
          value={this.props.value.value}
          options={this.buildProfileOptions()}
        />
        <p id="size-label">Sizes</p>
        <Select
          required
          isMulti
          defaultValue="Choose a profile"
          components={{ DropdownIndicator }}
          id="size"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
          value={this.props.value.sizes}
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
