/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { PureComponent } from 'react';
import Switch from 'react-switch';
import Select from 'react-select';
import Modal from 'react-modal';
import CreatableSelect from 'react-select/creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeTheme, makeSites } from '../../app/state/selectors';
import { makeAccounts } from '../../settings/state/selectors';
import { makeProfiles } from '../../profiles/state/selectors';
import { makeCurrentTask } from '../state/selectors';

import { appActions } from '../../app/state/actions';
import { TASK_FIELDS, taskActions } from '../../store/actions';
import * as getAllSizes from '../../constants/getAllSizes';
import { createStore, createSize } from '../../constants/tasks';
import { THEMES, mapThemeToColor } from '../../constants/themes';
import PLATFORMS from '../../constants/platforms';
import {
  buildProfileOptions,
  buildAccountOptions,
  buildCategoryOptions,
} from '../../constants/selects';

import { ReactComponent as NotInStock } from '../../styles/images/tasks/random-off.svg';
import { ReactComponent as InStock } from '../../styles/images/tasks/random.svg';
import { ReactComponent as NotRestocks } from '../../styles/images/tasks/restocks-off.svg';
import { ReactComponent as Restocks } from '../../styles/images/tasks/restocks.svg';
import { ReactComponent as NotOneCheckout } from '../../styles/images/tasks/one-checkout-off.svg';
import { ReactComponent as OneCheckout } from '../../styles/images/tasks/one-checkout.svg';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';
import { addTestId, renderSvgIcon } from '../../utils';
import { buildStyle } from '../../styles';

const modalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

export class CreateTaskPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.saveTask = this.saveTask.bind(this);

    this.state = {
      isLoadingStore: false,
      isLoadingSize: false,
    };
  }

  saveTask(e) {
    const { task, onAddNewTask } = this.props;
    const { amount } = task;

    e.preventDefault();
    const prevSize = task.size;
    const fsrMap = {
      FSR: "US/UK Men's",
      'CL FSR': 'Clothing',
    };
    const fsrSize = fsrMap[task.size];
    if (fsrSize) {
      const sizes = getAllSizes.buildSizesForCategory(fsrSize);
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
      case TASK_FIELDS.EDIT_STORE: {
        this.setState({ isLoadingStore: true });
        setTimeout(() => {
          const newOption = createStore(value);
          if (newOption) {
            onFieldChange({ field: TASK_FIELDS.EDIT_STORE, value: newOption });
          }
          this.setState({
            isLoadingStore: false,
          });
        }, 150);
        break;
      }
      case TASK_FIELDS.EDIT_SIZE: {
        this.setState({ isLoadingSize: true });
        setTimeout(() => {
          const newSize = createSize(value);
          if (newSize) {
            onFieldChange({ field: TASK_FIELDS.EDIT_SIZE, value: newSize });
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

  createOnChangeHandler(field, event) {
    const { onFieldChange, profiles, sites } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_STORE: {
        const store = {
          name: event.label,
          url: event.value,
          apiKey: event.apiKey,
          special: event.special || false,
        };
        return onFieldChange({ field, value: store });
      }
      case TASK_FIELDS.EDIT_TASK_CATEGORY:
      case TASK_FIELDS.EDIT_TASK_ACCOUNT: {
        if (!event) {
          return onFieldChange({ field, value: event });
        }
        return onFieldChange({ field, value: event.value });
      }
      case TASK_FIELDS.EDIT_TASK_TYPE: {
        const {
          task: { type },
        } = this.props;
        return onFieldChange({ field, value: type });
      }
      case TASK_FIELDS.EDIT_PROFILE: {
        const change = profiles.find(p => p.id === event.value);
        if (change) {
          return onFieldChange({ field, value: change });
        }
        return null;
      }
      case TASK_FIELDS.EDIT_SIZE:
        return onFieldChange({ field, value: event.value });
      case TASK_FIELDS.EDIT_PRODUCT:
        return onFieldChange({ field, value: event.target.value, sites });
      case TASK_FIELDS.TOGGLE_CAPTCHA:
      case TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK:
      case TASK_FIELDS.TOGGLE_ONE_CHECKOUT:
      case TASK_FIELDS.TOGGLE_RESTOCK_MODE: {
        return onFieldChange({ field });
      }
      default:
        // catch all for all other text inputs
        return onFieldChange({ field, value: event.target.value });
    }
  }

  renderExtraInputs() {
    const { task, onKeyPress, theme, accounts } = this.props;

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

    const { captcha, platform } = task;

    switch (platform) {
      case PLATFORMS.Supreme: {
        const { category, product, checkoutDelay } = task;
        const categoryValue = category ? { label: category, value: category } : null;
        return (
          <>
            <div className="col col--expand tasks-create__input-group--middle">
              <div className="row row--gutter">
                <div className="col col--expand col--no-gutter">
                  <p className="tasks-create__label">Category</p>
                  <Select
                    isClearable
                    backspaceRemovesValue
                    required
                    placeholder="No Category"
                    components={{
                      DropdownIndicator,
                      IndicatorSeparator,
                      Control,
                      Option,
                      Menu,
                      MenuList,
                    }}
                    styles={colourStyles(theme, buildStyle(false, null))}
                    onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_TASK_CATEGORY, e)}
                    value={categoryValue}
                    options={buildCategoryOptions()}
                    className="tasks-create__input tasks-create__input--field"
                    classNamePrefix="select"
                    data-testid={addTestId('CreateTask.accountSelect')}
                  />
                </div>
                <div className="col col--end col--no-gutter-right">
                  <p className="tasks-create__label">Variation</p>
                  <input
                    className="tasks-create__input tasks-create__input--bordered tasks-create__input--variation"
                    type="text"
                    placeholder="Color/Style"
                    onChange={e =>
                      this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT_VARIATION, e)
                    }
                    value={product.variation}
                    style={buildStyle(false, null)}
                    required
                    data-testid={addTestId('CreateTask.variation')}
                  />
                </div>
                <div className="col col--end col--no-gutter-right">
                  <p className="tasks-create__label">Delay</p>
                  <input
                    className="tasks-create__input tasks-create__input--bordered tasks-create__input--checkout-delay"
                    type="text"
                    placeholder="0"
                    onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_CHECKOUT_DELAY, e)}
                    value={checkoutDelay}
                    style={buildStyle(false, null)}
                    required
                    data-testid={addTestId('CreateTask.variation')}
                  />
                </div>
              </div>
            </div>
            <div className="col col--expand tasks-create__input-group--last">
              <div className="row row--gutter">
                <div className="col col--expand col--no-gutter">
                  <Switch
                    checked={captcha}
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
                    onChange={() => this.createOnChangeHandler(TASK_FIELDS.TOGGLE_CAPTCHA)}
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
                <div className="col col--expand col--no-gutter">
                  <input
                    type="number"
                    placeholder="# tasks"
                    className="tasks-create__amount"
                    onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_AMOUNT, e)}
                    value={task.amount}
                    style={buildStyle(false, null)}
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    data-testid={addTestId('CreateTask.amountInput')}
                  />
                </div>
                <div className="col col--expand col--no-gutter">
                  <span>x</span>
                </div>
                <div className="col col--expand col--no-gutter">
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
          </>
        );
      }
      default: {
        const { type, oneCheckout, restockMode, amount } = task;
        return (
          <>
            <div className="col col--expand tasks-create__input-group--middle">
              <div className="row row--gutter">
                <div className="col col--expand col--no-gutter">
                  <p className="tasks-create__label">Account</p>
                  <Select
                    isClearable
                    backspaceRemovesValue
                    required={false}
                    placeholder="No Account"
                    components={{
                      DropdownIndicator,
                      IndicatorSeparator,
                      Control,
                      Option,
                      Menu,
                      MenuList,
                    }}
                    styles={colourStyles(theme, buildStyle(false, null))}
                    onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_TASK_ACCOUNT, e)}
                    value={account}
                    options={buildAccountOptions(accounts)}
                    className="tasks-create__input tasks-create__input--field"
                    classNamePrefix="select"
                    data-testid={addTestId('CreateTask.accountSelect')}
                  />
                </div>
                <div
                  className="col col--end col--gutter"
                  style={{ marginBottom: '4px' }}
                  onClick={() => this.createOnChangeHandler(TASK_FIELDS.TOGGLE_ONE_CHECKOUT)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={onKeyPress}
                >
                  {oneCheckout
                    ? renderSvgIcon(OneCheckout, {
                        alt: 'One Checkout',
                        title: 'One Checkout',
                      })
                    : renderSvgIcon(NotOneCheckout, {
                        alt: 'One Checkout',
                        title: 'One Checkout',
                      })}
                </div>
                <div
                  className="col col--end col--no-gutter-left"
                  style={{ marginBottom: '4.5px' }}
                  onClick={() => this.createOnChangeHandler(TASK_FIELDS.TOGGLE_RESTOCK_MODE)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={onKeyPress}
                >
                  {restockMode
                    ? renderSvgIcon(Restocks, {
                        alt: 'Restock Mode',
                        title: 'Restock Mode',
                      })
                    : renderSvgIcon(NotRestocks, {
                        alt: 'Restock Mode',
                        title: 'Restock Mode',
                      })}
                </div>
              </div>
            </div>
            <div className="col col--expand tasks-create__input-group--last">
              <div className="row row--gutter">
                <div className="col col--expand col--no-gutter">
                  <p
                    className={`tasks-create__input--type-${type}`}
                    onKeyPress={onKeyPress}
                    onClick={() => this.createOnChangeHandler(TASK_FIELDS.EDIT_TASK_TYPE)}
                  >
                    {type}
                  </p>
                </div>
                <div className="col col--expand col--no-gutter">
                  <Switch
                    checked={captcha}
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
                    onChange={() => this.createOnChangeHandler(TASK_FIELDS.TOGGLE_CAPTCHA)}
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
                <div className="col col--expand col--no-gutter">
                  <input
                    type="number"
                    className="tasks-create__amount"
                    onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_AMOUNT, e)}
                    value={amount}
                    style={buildStyle(false, null)}
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    data-testid={addTestId('CreateTask.amountInput')}
                  />
                </div>
                <div className="col col--expand col--no-gutter">
                  <span>x</span>
                </div>
                <div className="col col--expand col--no-gutter">
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
          </>
        );
      }
    }
  }

  render() {
    const { show, toggleCreate, task, sites, theme, onKeyPress, profiles } = this.props;

    const { isLoadingStore, isLoadingSize } = this.state;
    let newTaskProfileValue = null;
    if (task.profile) {
      newTaskProfileValue = {
        value: task.profile.id,
        label: task.profile.name,
      };
    }

    const { randomInStock } = task.product;

    let newSizeValue = null;
    if (task.size) {
      newSizeValue = {
        label: task.size,
        value: task.size,
      };
    }
    let newTaskStoreValue = null;
    if (task.store && task.store.name !== null) {
      newTaskStoreValue = {
        value: task.store.url,
        label: task.store.name,
      };
    }

    return (
      <Modal
        isOpen={show}
        style={{
          ...modalStyles,
          content: { ...modalStyles.content, backgroundColor: mapThemeToColor[theme] },
        }}
        onRequestClose={toggleCreate}
      >
        <div className="tasks-create col col--start col--expand col--no-gutter">
          <div className="col col--expand tasks-create__input-group--first">
            <div className="row row--gutter">
              <div className="col col--expand col--no-gutter">
                <p className="tasks-create__label">Product</p>
                <input
                  className="tasks-create__input tasks-create__input--bordered tasks-create__input--field"
                  type="text"
                  placeholder="Variant, Keywords, Link"
                  onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT, e)}
                  value={task.product.raw}
                  style={buildStyle(false, null)}
                  required
                  data-testid={addTestId('CreateTask.productInput')}
                />
              </div>
              <div className="col col--expand col--no-gutter tasks-create__input-group--store">
                <p className="tasks-create__label">Store</p>
                <CreatableSelect
                  isClearable={false}
                  isDisabled={isLoadingStore}
                  isLoading={isLoadingStore}
                  required
                  className="tasks-create__input tasks-create__input--field"
                  classNamePrefix="select"
                  placeholder="Choose Store"
                  components={{
                    DropdownIndicator,
                    IndicatorSeparator,
                    Control,
                    Option,
                    Menu,
                    MenuList,
                  }}
                  styles={colourStyles(theme, buildStyle(false, null))}
                  isOptionDisabled={option => !option.supported && option.supported !== undefined}
                  onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_STORE, e)}
                  onCreateOption={v => this.handleCreate(TASK_FIELDS.EDIT_STORE, v)}
                  options={sites}
                  value={newTaskStoreValue}
                  data-testid={addTestId('CreateTask.siteSelect')}
                />
              </div>
            </div>
          </div>
          <div className="col col--expand tasks-create__input-group">
            <div className="row row--gutter">
              <div className="col col--expand col--no-gutter" style={{ flexGrow: 5 }}>
                <p className="tasks-create__label">Billing Profile</p>
                <Select
                  required
                  className="tasks-create__input tasks-create__input--field"
                  classNamePrefix="select"
                  placeholder="Choose Profile"
                  components={{
                    DropdownIndicator,
                    IndicatorSeparator,
                    Control,
                    Option,
                    Menu,
                    MenuList,
                  }}
                  styles={colourStyles(theme, buildStyle(false, null))}
                  onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE, e)}
                  value={newTaskProfileValue}
                  options={buildProfileOptions(profiles)}
                  data-testid={addTestId('CreateTask.profileSelect')}
                  data-private
                />
              </div>
              <div
                className="col col--expand col--no-gutter tasks-create__input-group--size"
                style={{ flexGrow: 3 }}
              >
                <p className="tasks-create__label">Size</p>
                <CreatableSelect
                  required
                  isLoading={isLoadingSize}
                  isClearable={false}
                  placeholder="Choose Size"
                  components={{
                    DropdownIndicator,
                    IndicatorSeparator,
                    Control,
                    Option,
                    Menu,
                    MenuList,
                  }}
                  styles={colourStyles(theme, buildStyle(false, null))}
                  onCreateOption={v => this.handleCreate(TASK_FIELDS.EDIT_SIZE, v)}
                  onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZE, e)}
                  value={newSizeValue}
                  options={getAllSizes.default()}
                  className="tasks-create__input tasks-create__input--field__short"
                  classNamePrefix="select"
                  data-testid={addTestId('CreateTask.sizesSelect')}
                />
              </div>
              <div
                className="col col--expand col--end col--no-gutter tasks-create__input-group--filter"
                style={{ flexGrow: 1 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onKeyPress={onKeyPress}
                  title={randomInStock ? 'Random In Stock' : 'Not Random In Stock'}
                  onClick={() => this.createOnChangeHandler(TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK)}
                >
                  {randomInStock
                    ? renderSvgIcon(InStock, {
                        title: 'Random In Stock',
                        alt: 'Random In Stock',
                        className: 'profiles__fields--matches',
                      })
                    : renderSvgIcon(NotInStock, {
                        title: 'Static stock',
                        alt: 'Static stock',
                        className: 'profiles__fields--matches',
                      })}
                </div>
              </div>
            </div>
          </div>
          {this.renderExtraInputs()}
        </div>
      </Modal>
    );
  }
}

CreateTaskPrimitive.propTypes = {
  onFieldChange: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  accounts: PropTypes.arrayOf(PropTypes.any).isRequired,
  show: PropTypes.bool.isRequired,
  toggleCreate: PropTypes.func.isRequired,
  sites: PropTypes.arrayOf(PropTypes.any).isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
  onAddNewTask: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

CreateTaskPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  show: state.App.toggleCreate,
  profiles: makeProfiles(state),
  accounts: makeAccounts(state),
  sites: makeSites(state),
  task: makeCurrentTask(state),
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  toggleCreate: () => dispatch(appActions.toggleCreate()),

  onFieldChange: changes => {
    dispatch(taskActions.edit(null, changes.field, changes.value, changes.sites));
  },

  onAddNewTask: (task, amount) => {
    dispatch(taskActions.create({ task, amount }));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateTaskPrimitive);
