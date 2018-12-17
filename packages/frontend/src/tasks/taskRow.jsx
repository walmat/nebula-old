import React, { Component } from 'react';
import AsyncSelect from 'react-select/lib/Async';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import getAllSizes from '../constants/getAllSizes';
import fetchSites from '../constants/getAllSites';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import sDefns from '../utils/definitions/settingsDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';
import pDefns from '../utils/definitions/profileDefinitions';
import addTestId from '../utils/addTestId';

import start from '../_assets/run.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import { taskActions, mapTaskFieldsToKey, TASK_FIELDS } from '../state/actions';
import { buildStyle } from '../utils/styles';

export class TaskRowPrimitive extends Component {
  createOnChangeHandler(field) {
    const { onEditTask, task } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        return async event => {
          const siteList = await fetchSites();
          const site = siteList.find(s => s.value === event.value);
          if (site) {
            onEditTask(task, {
              field,
              value: site,
            });
          }
        };
      }
      case TASK_FIELDS.EDIT_PROFILE: {
        return event => {
          const { profiles } = this.props;
          const value = profiles.find(p => p.id === event.value);
          if (value) {
            onEditTask(task, { field, value });
          }
        };
      }
      case TASK_FIELDS.EDIT_SIZES: {
        return event => {
          const values = event.map(s => s.value);
          onEditTask(task, { field, value: values });
        };
      }
      default: {
        return event => {
          onEditTask(task, { field, value: event.target.value });
        };
      }
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
    return profiles.map(profile => ({
      value: profile.id,
      label: profile.profileName,
    }));
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
        <img src={src} alt={desc} draggable="false" className={className} />
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
    const { isEditing, task, onKeyPress } = this.props;
    if (!isEditing) {
      return null;
    }
    const testIdBase = 'TaskRow.edit';
    const { edits, errors } = this.props;
    let editProduct = null;
    let editProfile = null;
    let editSizes = [];
    let editSite = null;
    let editAccountFieldDisabled = true;
    if (edits.product && edits.product.raw) {
      editProduct = edits.product.raw;
    }
    if (edits.profile && edits.profile.id !== null) {
      editProfile = {
        value: edits.profile.id,
        label: edits.profile.profileName,
      };
    }
    if (edits.sizes) {
      editSizes = edits.sizes.map(size => ({ value: size, label: `${size}` }));
    }
    if (edits.site) {
      editSite = {
        value: edits.site.url,
        label: edits.site.name,
      };
      editAccountFieldDisabled = !edits.site.auth;
    }
    return (
      <div key={`${task.id}-edit`} className="row row--expand tasks-row tasks-row--edit">
        <div className="col">
          <div className="row row--start">
            <div className="col edit-field">
              <p className="edit-field__label">Product</p>
              <input
                className="edit-field__input"
                type="text"
                placeholder="Variant, Keywords, Link"
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT)}
                value={editProduct}
                style={buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PRODUCT]])}
                required
                data-testid={addTestId(`${testIdBase}.productInput`)}
              />
            </div>
            <div className="col edit-field">
              <p className="edit-field__label">Site</p>
              <AsyncSelect
                required
                className="edit-field__select"
                classNamePrefix="select"
                placeholder="Choose Site"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SITE]]),
                )}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
                value={editSite}
                cacheOptions
                // defaultOptions={buildSitesOptions(sites)}
                loadOptions={fetchSites()}
                data-testid={addTestId(`${testIdBase}.siteSelect`)}
              />
            </div>
            <div className="col edit-field">
              <p className="edit-field__label">Billing Profile</p>
              <Select
                required
                classNamePrefix="select"
                className="edit-field__select"
                placeholder="Choose Profile"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PROFILE]]),
                )}
                value={editProfile}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
                options={this.buildProfileOptions()}
                data-testid={addTestId(`${testIdBase}.profileSelect`)}
              />
            </div>
            <div className="col edit-field">
              <p className="edit-field__label">Sizes</p>
              <Select
                required
                isMulti
                isClearable={false}
                classNamePrefix="select"
                className="edit-field__select"
                placeholder="Choose Sizes"
                components={{ DropdownIndicator }}
                styles={colourStyles(
                  buildStyle(false, errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_SIZES]]),
                )}
                value={editSizes}
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                options={getAllSizes()}
                data-testid={addTestId(`${testIdBase}.sizesSelect`)}
              />
            </div>
            <div className="col edit-field">
              <p className="edit-field__label">Username</p>
              <input
                className="edit-field__input"
                type="text"
                placeholder="johndoe@example.com"
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_USERNAME)}
                value={edits.username || ''}
                style={buildStyle(
                  editAccountFieldDisabled,
                  errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_USERNAME]],
                )}
                required={!editAccountFieldDisabled}
                disabled={editAccountFieldDisabled}
                data-testid={addTestId(`${testIdBase}.usernameInput`)}
              />
            </div>
            <div className="col edit-field">
              <p className="edit-field__label">Password</p>
              <input
                className="edit-field__input"
                type="text"
                placeholder="***********"
                onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PASSWORD)}
                value={edits.password || ''}
                style={buildStyle(
                  editAccountFieldDisabled,
                  errors[mapTaskFieldsToKey[TASK_FIELDS.EDIT_PASSWORD]],
                )}
                required={!editAccountFieldDisabled}
                disabled={editAccountFieldDisabled}
                data-testid={addTestId(`${testIdBase}.passwordInput`)}
              />
            </div>
          </div>
          <div className="row row--end">
            <div className="col action">
              <button
                type="button"
                className="action__button action__button--save"
                tabIndex={0}
                onKeyPress={onKeyPress}
                onClick={() => {
                  this.saveTask();
                }}
                data-testid={addTestId(`${testIdBase}.button.save`)}
              >
                Save
              </button>
            </div>
            <div className="col action">
              <button
                type="button"
                className="action__button action__button--cancel"
                tabIndex={0}
                onKeyPress={onKeyPress}
                onClick={() => {
                  this.cancelEdits();
                }}
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

  renderTableRowStartActionButton() {
    const { task, onStartTask, proxies } = this.props;
    return this.renderTableRowActionButton(
      'start',
      'Start Task',
      start,
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
      stop,
      task.status === 'stopped' ? 'active' : '',
      () => {
        onStopTask(task);
      },
    );
  }

  renderTableRowDestroyActionButton() {
    const { task, onDestroyTask } = this.props;
    return this.renderTableRowActionButton('destroy', 'Destroy Task', destroy, '', () => {
      onDestroyTask(task);
    });
  }

  renderTableRowEditButton() {
    const { isEditing } = this.props;
    return this.renderTableRowButton('edit', 'Edit Task', edit, isEditing ? 'active' : '', () => {
      this.selectTask();
    });
  }

  renderTableRow() {
    const { task } = this.props;
    let id = '--';
    if (task.id) {
      id = task.id < 10 ? `0${task.id}` : task.id;
    }
    let sizes = 'None';
    if (task.sizes.length) {
      sizes = task.sizes.reduce((acc, cur, idx) => `${idx ? `${acc}, ` : ''}${cur}`, '');
    }
    let taskAccountValue = 'None';
    if (task.username && task.password) {
      taskAccountValue = task.username;
    }
    return (
      <div key={task.id} className="tasks-row row">
        <div className="col col--no-gutter tasks-edit">{this.renderTableRowEditButton()}</div>
        <div className="col col--no-gutter tasks-row__id">{id}</div>
        <div className="col col--no-gutter tasks-row__product">{task.product.raw || 'None'}</div>
        <div className="col col--no-gutter tasks-row__sites">{task.site.name || 'None'}</div>
        <div className="col col--no-gutter tasks-row__profile">
          {task.profile.profileName || 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__sizes">{sizes}</div>
        <div className="col col--no-gutter tasks-row__account">{taskAccountValue}</div>
        <div className="col col--no-gutter tasks-row__actions">
          <div className="row row--gutter">
            {this.renderTableRowStartActionButton()}
            {this.renderTableRowStopActionButton()}
            {this.renderTableRowDestroyActionButton()}
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="tasks-row-container col">
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
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onCommitEdits: PropTypes.func.isRequired,
  onCancelEdits: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  errors: tDefns.taskEditErrors.isRequired,
};

TaskRowPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  proxies: state.settings.proxies,
  task: ownProps.task,
  edits: ownProps.task.edits,
  isEditing: ownProps.task.id === state.selectedTask.id,
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
