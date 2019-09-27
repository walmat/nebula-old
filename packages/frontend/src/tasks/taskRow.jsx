import React, { PureComponent } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { parseURL } from 'whatwg-url';
import { getAllSizesStripped } from '../constants/getAllSizes';
import getAllSites from '../constants/getAllSites';
import {
  DropdownIndicator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../utils/styles/select';
import sDefns from '../utils/definitions/settingsDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';
import pDefns from '../utils/definitions/profileDefinitions';
import { addTestId, renderSvgIcon } from '../utils';
import { ReactComponent as EditIcon } from '../_assets/edit.svg';
import { ReactComponent as CopyIcon } from '../_assets/copy.svg';
import { ReactComponent as StartIcon } from '../_assets/start.svg';
import { ReactComponent as StopIcon } from '../_assets/stop.svg';
import { ReactComponent as DestroyIcon } from '../_assets/destroy.svg';
import { taskActions, mapTaskFieldsToKey, TASK_FIELDS } from '../state/actions';
import { buildStyle } from '../utils/styles';

export class TaskRowPrimitive extends PureComponent {
  static createSite(value) {
    const sites = getAllSites();
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

    this.handleCreate = this.handleCreate.bind(this);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.saveTask = this.saveTask.bind(this);
    this.cancelEdits = this.cancelEdits.bind(this);
    this.selectTask = this.selectTask.bind(this);
    this.renderTableRowButton = this.renderTableRowButton.bind(this);
    this.renderTableRowActionButton = this.renderTableRowActionButton.bind(this);
    this.renderEditMenu = this.renderEditMenu.bind(this);
    this.renderTableRowCopyActionButton = this.renderTableRowCopyActionButton.bind(this);
    this.renderTableRowStartActionButton = this.renderTableRowStartActionButton.bind(this);
    this.renderTableRowStopActionButton = this.renderTableRowStopActionButton.bind(this);
    this.renderTableRowDestroyActionButton = this.renderTableRowDestroyActionButton.bind(this);
    this.renderTableRowEditButton = this.renderTableRowEditButton.bind(this);
    this.renderTableRow = this.renderTableRow.bind(this);

    this.state = {
      isLoadingSite: false,
      isLoadingSize: false,
    };
  }

  createOnChangeHandler(field, event) {
    const { onEditTask, task } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        const site = {
          name: event.label,
          url: event.value,
          apiKey: event.apiKey,
          localCheckout: event.localCheckout || false,
          special: event.special || false,
          auth: event.auth,
        };
        return onEditTask(task, { field, value: site });
      }
      case TASK_FIELDS.EDIT_PROFILE: {
        const { profiles } = this.props;
        const value = profiles.find(p => p.id === event.value);
        if (value) {
          return onEditTask(task, { field, value });
        }
        return null;
      }
      case TASK_FIELDS.EDIT_SIZES: {
        return onEditTask(task, { field, value: event.value });
      }
      default: {
        return onEditTask(task, { field, value: event.target.value });
      }
    }
  }

  handleCreate(value, field) {
    const { onEditTask, task } = this.props;

    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        this.setState({ isLoadingSite: true });
        setTimeout(() => {
          const newOption = TaskRowPrimitive.createSite(value);
          if (newOption) {
            onEditTask(task, { field, value: newOption });
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
          const newSize = TaskRowPrimitive.createSize(value);
          if (newSize) {
            onEditTask(task, { field, value: newSize });
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

  saveTask() {
    const { task, onCommitEdits } = this.props;
    onCommitEdits(task);
  }

  cancelEdits() {
    const { task, onCancelEdits } = this.props;
    onCancelEdits(task);
  }

  selectTask() {
    const { isEditing, onSelectTask, task } = this.props;
    if (!isEditing) {
      onSelectTask(task);
    } else {
      // deselect current task (or toggle it)
      onSelectTask(null);
    }
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    return profiles.map(profile => ({ value: profile.id, label: profile.profileName }));
  }

  renderTableRowButton(tag, desc, src, className, onClick) {
    const { onKeyPress } = this.props;
    return (
      <div
        role="button"
        tabIndex={0}
        title={desc}
        onKeyPress={onKeyPress}
        onClick={onClick}
        data-testid={addTestId(`TaskRow.button.${tag}`)}
      >
        {renderSvgIcon(src, { alt: desc, className })}
      </div>
    );
  }

  renderTableRowActionButton(tag, desc, src, className, onClick) {
    return (
      <div className="tasks-row__actions__button">
        {this.renderTableRowButton(`action.${tag}`, desc, src, className, onClick)}
      </div>
    );
  }

  renderEditMenu() {
    const { isEditing, task, onKeyPress, theme } = this.props;
    const { isLoadingSite, isLoadingSize } = this.state;
    if (!isEditing) {
      return null;
    }
    const testIdBase = 'TaskRow.edit';
    const { edits, errors } = this.props;
    let editProduct = null;
    let editProfile = null;
    let editSizes = null;
    let editSite = null;
    if (edits.product && edits.product.raw) {
      editProduct = edits.product.raw;
    }
    if (edits.profile && edits.profile.id !== null) {
      editProfile = {
        value: edits.profile.id,
        label: edits.profile.profileName,
      };
    }
    if (edits.size) {
      editSizes = { value: edits.size, label: edits.size };
    }
    if (edits.site) {
      editSite = {
        value: edits.site.url,
        label: edits.site.name,
      };
    }
    return (
      <div key={`${task.id}-edit`} className="row row--start row--expand tasks-row tasks-row--edit">
        <div className="col col--start col--expand">
          <div className="row row--start row--expand">
            <div className="col col--start col--expand edit-field" style={{ flexGrow: 2 }}>
              <p className="edit-field__label">Product</p>
              <input
                className="edit-field__input"
                type="text"
                placeholder="Variant, Keywords, Link"
                onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT, e)}
                value={editProduct}
                title={editProduct}
                style={buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PRODUCT]])}
                required
                data-testid={addTestId(`${testIdBase}.productInput`)}
              />
            </div>
            <div className="col col--start col--expand edit-field" style={{ flexGrow: 1 }}>
              <p className="edit-field__label">Site</p>
              <CreatableSelect
                isClearable={false}
                isDisabled={isLoadingSite}
                isLoading={isLoadingSite}
                required
                className="edit-field__select"
                classNamePrefix="select"
                placeholder="Choose Site"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SITE]]),
                )}
                onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE, e)}
                isOptionDisabled={option => !option.supported && option.supported !== undefined}
                onCreateOption={v => this.handleCreate(v, TASK_FIELDS.EDIT_SITE)}
                value={editSite}
                options={getAllSites()}
                data-testid={addTestId(`${testIdBase}.siteSelect`)}
              />
            </div>
            <div className="col col--start col--expand edit-field" style={{ flexGrow: 1 }}>
              <p className="edit-field__label">Billing Profile</p>
              <Select
                required
                classNamePrefix="select"
                className="edit-field__select"
                placeholder="Choose Profile"
                components={{ DropdownIndicator, Control, Option, Menu, MenuList }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PROFILE]]),
                )}
                value={editProfile}
                onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE, e)}
                options={this.buildProfileOptions()}
                data-testid={addTestId(`${testIdBase}.profileSelect`)}
                data-private
              />
            </div>
            <div className="col col--start col--expand edit-field" style={{ flexGrow: 1 }}>
              <p className="edit-field__label">Size</p>
              <CreatableSelect
                required
                isDisabled={isLoadingSize}
                isLoading={isLoadingSize}
                isClearable={false}
                placeholder="Choose Size"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  theme,
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SIZES]]),
                )}
                onCreateOption={v => this.handleCreate(v, TASK_FIELDS.EDIT_SIZES)}
                onChange={e => this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES, e)}
                value={editSizes}
                options={getAllSizesStripped()}
                className="edit-field__select"
                classNamePrefix="select"
                data-testid={addTestId(`${testIdBase}.sizesSelect`)}
              />
            </div>
            <div className="col col--start col--expand action" style={{ flexGrow: 0 }}>
              <button
                type="button"
                className="action__button action__button--save"
                tabIndex={0}
                onKeyPress={onKeyPress}
                onClick={() => this.saveTask()}
                data-testid={addTestId(`${testIdBase}.button.save`)}
              >
                Save
              </button>
            </div>
            <div className="col col--start col--expand action" style={{ flexGrow: 0 }}>
              <button
                type="button"
                className="action__button action__button--cancel"
                tabIndex={0}
                onKeyPress={onKeyPress}
                onClick={() => this.cancelEdits()}
                data-testid={addTestId(`${testIdBase}.button.cancel`)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderTableRowCopyActionButton() {
    const { task, onCopyTask } = this.props;
    return this.renderTableRowActionButton('copy', 'Copy Task', CopyIcon, '', () => {
      onCopyTask(task);
    });
  }

  renderTableRowStartActionButton() {
    const { task, onStartTask, proxies } = this.props;
    return this.renderTableRowActionButton(
      'start',
      'Start Task',
      StartIcon,
      task.status === 'running' ? 'active' : '',
      () => {
        onStartTask(task, proxies);
      },
    );
  }

  renderTableRowStopActionButton() {
    const { task, onStopTask } = this.props;
    return this.renderTableRowActionButton(
      'stop',
      'Stop Task',
      StopIcon,
      task.status === 'stopped' ? 'active' : '',
      () => {
        onStopTask(task);
      },
    );
  }

  renderTableRowDestroyActionButton() {
    const { task, onDestroyTask } = this.props;
    return this.renderTableRowActionButton('destroy', 'Destroy Task', DestroyIcon, '', () => {
      onDestroyTask(task);
    });
  }

  renderTableRowEditButton() {
    const { isEditing } = this.props;
    return this.renderTableRowButton(
      'edit',
      'Edit Task',
      EditIcon,
      isEditing ? 'active' : '',
      () => {
        this.selectTask();
      },
    );
  }

  renderTableRow() {
    const { task, theme } = this.props;
    let id = '--';

    const { isQueueBypass } = task;

    if (task.index) {
      id = task.index < 10 ? `0${task.index}` : task.index;
    }

    return (
      <div key={task.id} className="tasks-row row row--expand row--gutter">
        <div className="col col--no-gutter tasks-row__edit">{this.renderTableRowEditButton()}</div>
        <div
          className={
            task.type
              ? `col col--no-gutter tasks-row__id--${task.type}`
              : 'col col--no-gutter tasks-row__id'
          }
        >
          {id}
        </div>
        <div
          className={
            isQueueBypass
              ? `col col--no-gutter tasks-row__product--checkout-ready-${theme}`
              : 'col col--no-gutter tasks-row__product'
          }
          title={task.product.raw}
        >
          {`${task.product.raw} ${task.product.variation ? `/ ${task.product.variation}` : ''}`}
        </div>
        <div
          className={
            isQueueBypass
              ? `col col--no-gutter tasks-row__sites--checkout-ready-${theme}`
              : 'col col--no-gutter tasks-row__sites'
          }
        >
          {task.site.name || 'None'}
        </div>
        <div
          className={
            isQueueBypass
              ? `col col--no-gutter tasks-row__profile--checkout-ready-${theme}`
              : 'col col--no-gutter tasks-row__profile'
          }
        >
          {task.profile.profileName || 'None'}
        </div>
        <div
          className={
            isQueueBypass
              ? `col col--no-gutter tasks-row__sizes--checkout-ready-${theme}`
              : 'col col--no-gutter tasks-row__sizes'
          }
        >
          {task.size}
        </div>
        <div
          className={
            isQueueBypass
              ? `col col--no-gutter tasks-row__account--checkout-ready-${theme}`
              : 'col col--no-gutter tasks-row__account'
          }
        >
          {task.account ? task.account.name : 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__actions">
          <div className="row row--gutter">
            {this.renderTableRowCopyActionButton()}
            {this.renderTableRowStartActionButton()}
            {this.renderTableRowStopActionButton()}
            {this.renderTableRowDestroyActionButton()}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { style } = this.props;
    return (
      <div style={style} className="col col--expand col--no-gutter tasks-row-container">
        {this.renderTableRow()}
        {this.renderEditMenu()}
      </div>
    );
  }
}

TaskRowPrimitive.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  proxies: PropTypes.arrayOf(sDefns.proxy).isRequired,
  profiles: pDefns.profileList.isRequired,
  task: tDefns.task.isRequired,
  edits: tDefns.taskEdit.isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onCopyTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onCommitEdits: PropTypes.func.isRequired,
  onCancelEdits: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
  errors: tDefns.taskEditErrors.isRequired,
};

TaskRowPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  proxies: state.settings.proxies,
  task: ownProps.task,
  style: ownProps.style,
  edits: ownProps.task.edits,
  isEditing: ownProps.task.id === state.selectedTask.id,
  theme: state.theme,
  errors: ownProps.task.edits.errors,
});

export const mapDispatchToProps = dispatch => ({
  onEditTask: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
  onCancelEdits: task => {
    dispatch(taskActions.clearEdits(task.id, task));
  },
  onCommitEdits: task => {
    dispatch(taskActions.update(task.id, task));
  },
  onSelectTask: task => {
    dispatch(taskActions.select(task));
  },
  onUpdateTask: task => {
    dispatch(taskActions.update(task.id, task));
  },
  onCopyTask: task => {
    dispatch(taskActions.copy(task));
  },
  onStartTask: (task, proxies) => {
    dispatch(taskActions.start(task, proxies));
  },
  onStopTask: task => {
    dispatch(taskActions.stop(task));
  },
  onDestroyTask: task => {
    dispatch(taskActions.destroy(task, 'one'));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskRowPrimitive);
