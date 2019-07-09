import React, { PureComponent } from 'react';
import Switch from 'react-switch';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { parseURL } from 'whatwg-url';

import { TASK_FIELDS, mapTaskFieldsToKey, taskActions } from '../state/actions';
import * as getAllSizes from '../constants/getAllSizes';
import getAllSupportedSitesSorted from '../constants/getAllSites';

import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class CreateTaskPrimitive extends PureComponent {
  static createOption(value) {
    const sites = getAllSupportedSitesSorted();
    const exists = sites.find(s => s.value.indexOf(value) > -1);
    if (exists) {
      return {
        name: exists.label,
        url: exists.value,
        localCheckout: exists.localCheckout || false,
        special: exists.special || false,
        apiKey: exists.apiKey,
        auth: exists.auth,
      };
    }
    const URL = parseURL(value);
    if (!URL || !URL.host) {
      return null;
    }
    return { name: URL.host, url: `${URL.scheme}://${URL.host}` };
  }

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.saveTask = this.saveTask.bind(this);

    this.state = {
      isLoading: false,
      bypass: false,
    };
  }

  handleChange(bypass) {
    this.setState({ bypass });
  }

  buildProfileOptions() {
    // eslint-disable-next-line react/destructuring-assignment
    return this.props.profiles.map(profile => ({
      value: profile.id,
      label: profile.profileName,
    }));
  }

  saveTask(e) {
    const { task, onAddNewTask } = this.props;
    const { bypass } = this.state;

    const amount = task.amount ? parseInt(task.amount, 10) : 1;

    e.preventDefault();
    const prevSizes = task.sizes;
    const fsrMap = {
      FSR: "US/UK Men's",
      'CL FSR': 'Clothing',
    };
    const fsrSize = task.sizes.find(s => fsrMap[s]);
    if (fsrSize) {
      const fsrCategory = fsrMap[fsrSize];
      const sizes = getAllSizes.buildSizesForCategory(fsrCategory);
      sizes.forEach(s => {
        task.sizes = [s.value];
        onAddNewTask(task, amount, bypass);
      });
      task.sizes = prevSizes;
    } else if (task.sizes.find(s => s === 'BS')) {
      const sizes = ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5'];
      sizes.forEach(s => {
        task.sizes = [s];
        onAddNewTask(task, amount, bypass);
      });
      task.sizes = prevSizes;
    } else {
      onAddNewTask(task, amount, bypass);
    }
  }

  handleCreate(value) {
    const { onFieldChange } = this.props;
    this.setState({ isLoading: true });
    setTimeout(() => {
      const newOption = CreateTaskPrimitive.createOption(value);
      if (newOption) {
        onFieldChange({ field: TASK_FIELDS.EDIT_SITE, value: newOption });
      }
      this.setState({
        isLoading: false,
      });
    }, 500);
  }

  createOnChangeHandler(field) {
    const { onFieldChange, profiles } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        return event => {
          const site = {
            name: event.label,
            url: event.value,
            apiKey: event.apiKey,
            localCheckout: event.localCheckout || false,
            special: event.special || false,
            auth: event.auth,
          };
          onFieldChange({ field, value: site });
        };
      }
      case TASK_FIELDS.EDIT_PROFILE:
        return event => {
          const change = profiles.find(p => p.id === event.value);
          if (change) {
            onFieldChange({ field, value: change });
          }
        };
      case TASK_FIELDS.EDIT_SIZES:
        return event => {
          if (Array.isArray(event)) {
            onFieldChange({ field, value: event.map(s => s.value) });
          } else {
            // Hot fix for single size changes -- dispatch two events to mock a
            // multi select remove and then add.
            onFieldChange({ field, value: [] });
            onFieldChange({ field, value: [event.value] });
          }
        };
      case TASK_FIELDS.EDIT_PRODUCT:
      case TASK_FIELDS.EDIT_PAIRS:
        return event => {
          onFieldChange({ field, value: event.target.value });
        };
      default:
        // should never be called, but nice to have just in case
        return event => {
          onFieldChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    const { task, errors, onKeyPress, theme } = this.props;
    const { isLoading, bypass } = this.state;
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
      accountFieldsDisabled = !task.site.auth && task.site.auth !== undefined;
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
                <CreatableSelect
                  isClearable={false}
                  isDisabled={isLoading}
                  isLoading={isLoading}
                  required
                  className="tasks-create__input tasks-create__input--field"
                  classNamePrefix="select"
                  placeholder="Choose Site"
                  components={{ DropdownIndicator }}
                  styles={colourStyles(
                    theme,
                    buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SITE]]),
                  )}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
                  onCreateOption={this.handleCreate}
                  value={newTaskSiteValue}
                  options={getAllSupportedSitesSorted()}
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
                classNamePrefix="select"
                placeholder="Choose Profile"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PROFILE]]),
                )}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
                value={newTaskProfileValue}
                options={this.buildProfileOptions()}
                data-testid={addTestId('CreateTask.profileSelect')}
                data-private
              />
            </div>
            <div className="col col--no-gutter tasks-create__input-group--site">
              <p className="tasks-create__label">Size</p>
              <Select
                required
                isClearable={false}
                placeholder="Choose Size"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SIZES]]),
                )}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                value={sizes}
                options={getAllSizes.default()}
                className="tasks-create__input tasks-create__input--field"
                classNamePrefix="select"
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
                  style={buildStyle(
                    accountFieldsDisabled,
                    errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_USERNAME]],
                  )}
                  data-testid={addTestId('CreateTask.usernameInput')}
                  data-private
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
                  style={buildStyle(
                    accountFieldsDisabled,
                    errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PASSWORD]],
                  )}
                  required={!accountFieldsDisabled}
                  disabled={accountFieldsDisabled}
                  data-testid={addTestId('CreateTask.passwordInput')}
                  data-private
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <Switch
              checked={bypass}
              onChange={this.handleChange}
              onColor="#b8d9d2"
              onHandleColor="#46adb4"
              handleDiameter={14}
              uncheckedIcon={false}
              checkedIcon={false}
              boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
              activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
              height={10}
              width={28}
              className="react-switch"
            />
          </div>
          <div className="col">
            <input
              type="number"
              className="tasks-create__amount"
              onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_AMOUNT)}
              value={task.amount || 1}
              style={buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_AMOUNT]])}
              tabIndex={0}
              onKeyPress={onKeyPress}
              data-testid={addTestId('CreateTask.amountInput')}
            />
          </div>
          <div className="col col--no-gutter">
            <span>x</span>
          </div>
          <div className="col">
            <button
              type="button"
              className="tasks-create__submit"
              tabIndex={0}
              onKeyPress={onKeyPress}
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
  theme: PropTypes.string.isRequired,
  errors: tDefns.taskErrors.isRequired,
  onAddNewTask: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

CreateTaskPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  task: state.newTask,
  theme: state.theme,
  errors: state.newTask.errors,
});

export const mapDispatchToProps = dispatch => ({
  onFieldChange: changes => {
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask, amount, bypass) => {
    dispatch(taskActions.add(newTask, amount, bypass));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateTaskPrimitive);
