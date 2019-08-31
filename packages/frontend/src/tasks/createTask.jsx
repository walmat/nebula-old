/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
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
import { THEMES } from '../constants/themes';

// import sDefns from '../utils/definitions/settingsDefinitions';
import pDefns from '../utils/definitions/profileDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class CreateTaskPrimitive extends PureComponent {
  static createSite(value) {
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

  static createSize(value) {
    if (!value) {
      return null;
    }
    return value;
  }

  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.saveTask = this.saveTask.bind(this);

    this.state = {
      isLoadingSite: false,
      isLoadingSize: false,
    };
  }

  buildProfileOptions() {
    // eslint-disable-next-line react/destructuring-assignment
    return this.props.profiles.map(profile => ({
      value: profile.id,
      label: profile.profileName,
    }));
  }

  buildAccountOptions() {
    const { accounts } = this.props;

    return accounts.map(({ id, name, username, password }) => ({
      label: name,
      value: {
        id,
        name,
        username,
        password,
      },
    }));
  }

  saveTask(e) {
    const { task, onAddNewTask } = this.props;

    const amount = task.amount ? parseInt(task.amount, 10) : 1;

    e.preventDefault();
    const prevSize = task.size;
    const fsrMap = {
      FSR: "US/UK Men's",
      'CL FSR': 'Clothing',
    };
    const fsrSize = fsrMap[task.size];
    if (fsrSize) {
      const fsrCategory = fsrMap[fsrSize];
      const sizes = getAllSizes.buildSizesForCategory(fsrCategory);
      sizes.forEach(s => {
        task.size = s.value;
        onAddNewTask(task, amount);
      });
      task.size = prevSize;
    } else if (task.size === 'BS') {
      const sizes = ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5'];
      sizes.forEach(s => {
        task.size = s;
        onAddNewTask(task, amount);
      });
      task.sizes = prevSize;
    } else {
      onAddNewTask(task, amount);
    }
  }

  handleCreate(field, value) {
    const { onFieldChange } = this.props;

    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        this.setState({ isLoadingSite: true });
        setTimeout(() => {
          const newOption = CreateTaskPrimitive.createSite(value);
          if (newOption) {
            onFieldChange({ field: TASK_FIELDS.EDIT_SITE, value: newOption });
          }
          this.setState({
            isLoadingSite: false,
          });
        }, 150);
        break;
      }
      case TASK_FIELDS.EDIT_SIZES: {
        this.setState({ isLoadingSize: true });
        setTimeout(() => {
          const newSize = CreateTaskPrimitive.createSize(value);
          if (newSize) {
            onFieldChange({ field: TASK_FIELDS.EDIT_SIZES, value: newSize });
          }
          this.setState({
            isLoadingSize: false,
          });
        }, 150);
        break;
      }
      default:
        break;
    }
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
      case TASK_FIELDS.EDIT_TASK_ACCOUNT: {
        return event => {
          if (!event) {
            return onFieldChange({ field, value: event });
          }
          return onFieldChange({ field, value: event.value });
        };
      }
      case TASK_FIELDS.EDIT_TASK_TYPE: {
        const {
          task: { type },
        } = this.props;
        return () => {
          onFieldChange({ field, value: type });
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
          onFieldChange({ field, value: event.value });
        };
      case TASK_FIELDS.EDIT_PRODUCT:
      case TASK_FIELDS.EDIT_PAIRS:
        return event => {
          onFieldChange({ field, value: event.target.value });
        };
      case TASK_FIELDS.TOGGLE_CAPTCHA:
        return () => onFieldChange({ field });
      default:
        // should never be called, but nice to have just in case
        return event => {
          onFieldChange({ field, value: event.target.value });
        };
    }
  }

  render() {
    const { task, errors, onKeyPress, theme } = this.props;
    const { isLoadingSite, isLoadingSize } = this.state;
    let newTaskProfileValue = null;
    if (task.profile.id) {
      newTaskProfileValue = {
        value: task.profile.id,
        label: task.profile.profileName,
      };
    }

    let newSizeValue = null;
    if (task.size) {
      newSizeValue = {
        label: task.size,
        value: task.size,
      };
    }
    let newTaskSiteValue = null;
    if (task.site && task.site.name !== null) {
      newTaskSiteValue = {
        value: task.site.url,
        label: task.site.name,
      };
    }

    let account = null;

    if (task.account) {
      const { name, id, username, password } = task.account;
      account = {
        label: name,
        value: {
          id,
          name,
          username,
          password,
        },
      };
    }

    const { type, forceCaptcha } = task;
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
                  isDisabled={isLoadingSite}
                  isLoading={isLoadingSite}
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
                  onCreateOption={v => this.handleCreate(TASK_FIELDS.EDIT_SITE, v)}
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
              <CreatableSelect
                required
                isLoading={isLoadingSize}
                isClearable={false}
                placeholder="Choose Size"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SIZES]]),
                )}
                onCreateOption={v => this.handleCreate(TASK_FIELDS.EDIT_SIZES, v)}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                value={newSizeValue}
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
                <p className="tasks-create__label">Account</p>
                <Select
                  isClearable
                  backspaceRemovesValue
                  required={false}
                  placeholder="No Account"
                  components={{ DropdownIndicator }}
                  styles={colourStyles(theme, buildStyle(false, null))}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_TASK_ACCOUNT)}
                  value={account}
                  options={this.buildAccountOptions()}
                  className="tasks-create__input tasks-create__input--field"
                  classNamePrefix="select"
                  data-testid={addTestId('CreateTask.accountSelect')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col col--no-gutter">
            <p
              className={`tasks-create__input--type-${type}`}
              onKeyPress={onKeyPress}
              onClick={this.createOnChangeHandler(TASK_FIELDS.EDIT_TASK_TYPE)}
            >
              {type}
            </p>
          </div>
          <div className="col col--no-gutter-right">
            <Switch
              checked={forceCaptcha}
              checkedIcon={
                <svg width="16" height="16" viewBox="-5 -1 16 16" version="1.1">
                  <g id="surface1">
                    <path
                      style={{
                        stroke: 'none',
                        fillRule: 'nonzero',
                        fill: 'rgb(10.980392%,22.745098%,66.27451%)',
                        fillOpacity: '1',
                      }}
                      d="M 8 3.996094 L 7.996094 3.824219 L 7.996094 0.585938 L 7.101562 1.480469 C 6.367188 0.585938 5.253906 0.0117188 4.007812 0.0117188 C 2.707031 0.0117188 1.554688 0.632812 0.824219 1.589844 L 2.289062 3.074219 C 2.433594 2.808594 2.636719 2.582031 2.886719 2.40625 C 3.140625 2.207031 3.503906 2.042969 4.007812 2.042969 C 4.066406 2.042969 4.113281 2.050781 4.148438 2.066406 C 4.769531 2.113281 5.308594 2.457031 5.625 2.953125 L 4.589844 3.992188 L 8 3.992188"
                    />
                    <path
                      style={{
                        stroke: 'none',
                        fillRule: 'nonzero',
                        fill: 'rgb(25.882353%,52.156863%,95.686275%)',
                        fillOpacity: '1',
                      }}
                      d="M 3.984375 0.0117188 L 3.8125 0.015625 L 0.574219 0.015625 L 1.46875 0.910156 C 0.574219 1.644531 0 2.757812 0 4.003906 C 0 5.304688 0.621094 6.457031 1.578125 7.1875 L 3.0625 5.722656 C 2.796875 5.578125 2.570312 5.375 2.394531 5.125 C 2.195312 4.871094 2.03125 4.507812 2.03125 4.003906 C 2.03125 3.945312 2.039062 3.898438 2.054688 3.863281 C 2.101562 3.242188 2.445312 2.703125 2.945312 2.386719 L 3.980469 3.421875 L 3.984375 0.0117188 "
                    />
                    <path
                      style={{
                        stroke: 'none',
                        fillRule: 'nonzero',
                        fill: 'rgb(67.058824%,67.058824%,67.058824%)',
                        fillOpacity: '1',
                      }}
                      d="M 0 4.003906 L 0.00390625 4.175781 L 0.00390625 7.414062 L 0.898438 6.519531 C 1.632812 7.414062 2.746094 7.988281 3.996094 7.988281 C 5.292969 7.988281 6.445312 7.367188 7.175781 6.410156 L 5.710938 4.925781 C 5.566406 5.191406 5.363281 5.417969 5.117188 5.59375 C 4.859375 5.792969 4.496094 5.957031 3.996094 5.957031 C 3.933594 5.957031 3.886719 5.949219 3.851562 5.933594 C 3.230469 5.886719 2.691406 5.542969 2.375 5.046875 L 3.414062 4.007812 C 2.097656 4.011719 0.613281 4.015625 0 4.007812"
                    />
                  </g>
                </svg>
              }
              onChange={this.createOnChangeHandler(TASK_FIELDS.TOGGLE_CAPTCHA)}
              onColor={theme === THEMES.LIGHT ? '#F8AC8A' : '#F7E6AE'}
              onHandleColor={theme === THEMES.LIGHT ? '#F68E5F' : '#F5DD90'}
              handleDiameter={14}
              uncheckedIcon={false}
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
  // accounts: sDefns.settings.accounts.isRequired,
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
  accounts: state.settings.accounts.list,
  task: state.newTask,
  theme: state.theme,
  errors: state.newTask.errors,
});

export const mapDispatchToProps = dispatch => ({
  onFieldChange: changes => {
    dispatch(taskActions.edit(null, changes.field, changes.value));
  },
  onAddNewTask: (newTask, amount) => {
    dispatch(taskActions.add(newTask, amount));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateTaskPrimitive);
