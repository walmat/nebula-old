import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../state/actions';
import getAllSizes from '../getSizes';
import getAllSites from '../getSites';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';

class CreateTask extends Component {
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
    return this.props.profiles.map(profile => ({ value: profile.id, label: profile.profileName }));
  }

  saveTask(e) {
    e.preventDefault();
    this.props.onAddNewTask(this.props.task);
  }

  createOnChangeHandler(field) {
    switch (field) {
      case TASK_FIELDS.EDIT_SITE:
        return (event) => {
          const site = { name: event.label, url: event.value, auth: event.auth };
          this.props.onChange({ field, value: site });
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
      case TASK_FIELDS.EDIT_PRODUCT:
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
    if (this.props.task.profile.id) {
      newTaskProfileValue = {
        value: this.props.task.profile.id,
        label: this.props.task.profile.profileName,
      };
    }
    let sizes = [];
    if (this.props.task.sizes !== '') {
      sizes = this.props.task.sizes.map(size => ({ value: size, label: `${size}` }));
    }
    let newTaskSiteValue = null;
    if (this.props.task.site !== null) {
      newTaskSiteValue = {
        value: this.props.task.site.url,
        label: this.props.task.site.name,
      };
    }
    let accountFieldsDisabled = true;
    if (this.props.task.site !== null) {
      accountFieldsDisabled = !this.props.task.site.auth;
    }
    return (
      <div className="tasks-create col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col tasks-create__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="tasks-create__label">Product</p>
                <input
                  className="tasks-create__input tasks-create__input--bordered tasks-create__input--field"
                  type="text"
                  placeholder="Variant, Keywords, Link"
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT)}
                  value={this.props.task.product.raw}
                  required
                />
              </div>
              <div className="col col--no-gutter tasks-create__input-group--site">
                <p className="tasks-create__label">Site</p>
                <Select
                  required
                  className="tasks-create__input tasks-create__input--field"
                  classNamePrefix="select"
                  placeholder="Choose Site"
                  components={{ DropdownIndicator }}
                  styles={colourStyles}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
                  value={newTaskSiteValue}
                  options={getAllSites()}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col tasks-create__input-group">
          <div className="row row--gutter">
            <div className="col col--no-gutter">
              <p className="tasks-create__label">Billing Profile</p>
              <Select
                required
                placeholder="Choose Profile"
                components={{ DropdownIndicator }}
                styles={colourStyles}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
                value={newTaskProfileValue}
                options={this.buildProfileOptions()}
                className="tasks-create__input tasks-create__input--field"
              />
            </div>
            <div className="col col--no-gutter tasks-create__input-group--site">
              <p className="tasks-create__label">Sizes</p>
              <Select
                required
                isMulti
                isClearable={false}
                placeholder="Choose Sizes"
                components={{ DropdownIndicator }}
                styles={colourStyles}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                value={sizes}
                options={getAllSizes()}
                className="tasks-create__input tasks-create__input--field"
              />
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col tasks-create__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="tasks-create__label">Username</p>
                <input
                  className="tasks-create__input tasks-create__input--bordered tasks-create__input--field"
                  type="text"
                  placeholder="johndoe@example.com"
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_USERNAME)}
                  value={this.props.task.username}
                  required={accountFieldsDisabled}
                  disabled={accountFieldsDisabled}
                />
              </div>
              <div className="col col--no-gutter tasks-create__input-group--site">
                <p className="tasks-create__label">Password</p>
                <input
                  className="tasks-create__input tasks-create__input--bordered tasks-create__input--field"
                  type="text"
                  placeholder="***********"
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PASSWORD)}
                  value={this.props.task.password}
                  required={accountFieldsDisabled}
                  disabled={accountFieldsDisabled}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              className="tasks-create__submit"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={this.saveTask}
            >
            Submit
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateTask.propTypes = {
  onChange: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  task: tDefns.task.isRequired,
  onAddNewTask: PropTypes.func.isRequired,
};


const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  task: ownProps.taskToEdit,
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
