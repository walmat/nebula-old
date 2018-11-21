import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, mapTaskFieldsToKey, taskActions } from '../state/actions';
import getAllSizes from '../constants/getAllSizes';
import getAllSites from '../constants/getAllSites';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class CreateTaskPrimitive extends Component {
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
    const { task, onAddNewTask } = this.props;
    e.preventDefault();
    onAddNewTask(task);
  }

  createOnChangeHandler(field) {
    switch (field) {
      case TASK_FIELDS.EDIT_SITE:
        return (event) => {
          const site = { name: event.label, url: event.value, auth: event.auth };
          this.props.onFieldChange({ field, value: site });
        };
      case TASK_FIELDS.EDIT_PROFILE:
        return (event) => {
          const change = this.props.profiles.find(p => p.id === event.value);
          if (change) {
            this.props.onFieldChange({ field, value: change });
          }
        };
      case TASK_FIELDS.EDIT_SIZES:
        return (event) => {
          const values = event.map(s => s.value);
          this.props.onFieldChange({ field, value: values });
        };
      case TASK_FIELDS.EDIT_PRODUCT:
      case TASK_FIELDS.EDIT_PAIRS:
        return (event) => {
          this.props.onFieldChange({ field, value: event.target.value });
        };
      default:
        // should never be called, but nice to have just in case
        return (event) => {
          this.props.onFieldChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    const { task, errors } = this.props;
    let newTaskProfileValue = null;
    if (task.profile.id) {
      newTaskProfileValue = {
        value: task.profile.id,
        label: task.profile.profileName,
      };
    }
    const sizes = task.sizes.map(size => ({ value: size, label: `${size}` }));
    let newTaskSiteValue = null;
    if (task.site && task.site.name !== null) {
      newTaskSiteValue = {
        value: task.site.url,
        label: task.site.name,
      };
    }
    let accountFieldsDisabled = true;
    if (task.site !== null) {
      accountFieldsDisabled = !task.site.auth;
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
                  value={task.product.raw}
                  style={buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PRODUCT]])}
                  required
                  data-testid={addTestId('CreateTask.productInput')}
                />
              </div>
              <div className="col col--no-gutter tasks-create__input-group--site">
                <p className="tasks-create__label">Site</p>
                <Select
                  required
                  className="tasks-create__input tasks-create__input--field"
                  placeholder="Choose Site"
                  components={{ DropdownIndicator }}
                  styles={colourStyles(buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SITE]]))}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
                  value={newTaskSiteValue}
                  options={getAllSites()}
                  data-testid={addTestId('CreateTask.siteSelect')}
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
                className="tasks-create__input tasks-create__input--field"
                placeholder="Choose Profile"
                components={{ DropdownIndicator }}
                styles={colourStyles(buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PROFILE]]))}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
                value={newTaskProfileValue}
                options={this.buildProfileOptions()}
                data-testid={addTestId('CreateTask.profileSelect')}
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
                styles={colourStyles(buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SIZES]]))}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                value={sizes}
                options={getAllSizes()}
                className="tasks-create__input tasks-create__input--field"
                data-testid={addTestId('CreateTask.sizesSelect')}
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
                  value={task.username || ''}
                  required={!accountFieldsDisabled}
                  disabled={accountFieldsDisabled}
                  style={buildStyle(accountFieldsDisabled, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_USERNAME]])}
                  data-testid={addTestId('CreateTask.usernameInput')}
                />
              </div>
              <div className="col col--no-gutter tasks-create__input-group--site">
                <p className="tasks-create__label">Password</p>
                <input
                  className="tasks-create__input tasks-create__input--bordered tasks-create__input--field"
                  type="text"
                  placeholder="***********"
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PASSWORD)}
                  value={task.password || ''} // change this to only show :onFocus later https://github.com/walmat/nebula/pull/68#discussion_r216173245
                  style={buildStyle(accountFieldsDisabled, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PASSWORD]])}
                  required={!accountFieldsDisabled}
                  disabled={accountFieldsDisabled}
                  data-testid={addTestId('CreateTask.passwordInput')}
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
              onKeyPress={this.props.onKeyPress}
              onClick={this.saveTask}
              data-testid={addTestId('CreateTask.submitButton')}
            >
            Submit
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateTaskPrimitive.propTypes = {
  onFieldChange: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  task: tDefns.task.isRequired,
  errors: tDefns.taskErrors.isRequired,
  onAddNewTask: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

CreateTaskPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  task: ownProps.taskToEdit,
  errors: ownProps.taskToEdit.errors,
});

export const mapDispatchToProps = dispatch => ({
  onFieldChange: (changes) => {
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask) => {
    dispatch(taskActions.add(newTask));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTaskPrimitive);
