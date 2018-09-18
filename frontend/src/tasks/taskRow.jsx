import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import getAllSizes from '../getSizes';
import getAllSites from '../getSites';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';

import start from '../_assets/run.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';
import { taskActions, TASK_FIELDS } from '../state/actions';

class TaskRow extends Component {
  static formatPairs(val) {
    if (val.length === 0) {
      return 1;
    }
    return val <= 5 && val > 0 ? val : null;
  }

  static renderTableRowButton(desc, src, className, onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        title={desc}
        onKeyPress={() => {}}
        onClick={onClick}
      >
        <img
          src={src}
          alt={desc}
          draggable="false"
          className={className}
        />
      </div>
    );
  }

  static renderTableRowActionButton(desc, src, className, onClick) {
    return (
      <div className="task-row__actions__button">
        {TaskRow.renderTableRowButton(desc, src, className, onClick)}
      </div>
    );
  }

  createOnChangeHandler(field) {
    const { onEditTask, task } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        return (event) => {
          const site = { name: event.label, url: event.value, auth: event.auth };
          onEditTask(task, { field, value: site });
        };
      }
      case TASK_FIELDS.EDIT_PROFILE: {
        return (event) => {
          const value = this.props.profiles.find(p => p.id === event.value);
          onEditTask(task, { field, value });
        };
      }
      case TASK_FIELDS.EDIT_SIZES: {
        return (event) => {
          const values = event.map(s => s.value);
          onEditTask(task, { field, value: values });
        };
      }
      default: {
        return (event) => {
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

  selectTask(task) {
    if (this.props.selectedTask.id !== task.id) {
      this.props.onSelectTask(task);
    } else {
      // deselect current task (or toggle it)
      this.props.onSelectTask(null);
    }
  }

  buildProfileOptions() {
    return this.props.profiles.map(profile => ({ value: profile.id, label: profile.profileName }));
  }

  renderEditMenu() {
    if (this.props.isEditing) {
      const { edits } = this.props;
      let editProfile = null;
      if (edits.profile.id !== null) {
        editProfile = {
          value: edits.profile.id,
          label: edits.profile.profileName,
        };
      }
      let editSizes = [];
      if (edits.sizes) {
        editSizes = edits.sizes.map(size => ({ value: size, label: `${size}` }));
      }
      let editSite = null;
      let editAccountFieldDisabled = true;
      if (edits.site) {
        editSite = {
          value: edits.site.url,
          label: edits.site.name,
        };
        editAccountFieldDisabled = !edits.site.auth;
      }
      return (
        <div key={`${this.props.task.id}-edit`} className="row row--expand tasks-row tasks-row--edit">
          <div className="col">
            <div className="row row--start">
              <div className="col edit-field">
                <p className="edit-field__label">Product</p>
                <input
                  className="edit-field__input"
                  type="text"
                  placeholder="Variant, Keywords, Link"
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PRODUCT)}
                  value={edits.product.raw || ''}
                  required
                />
              </div>
              <div className="col edit-field">
                <p className="edit-field__label">Site</p>
                <Select
                  required
                  className="edit-field__select"
                  classNamePrefix="select"
                  placeholder="Choose Site"
                  components={{ DropdownIndicator }}
                  styles={colourStyles}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SITE)}
                  value={editSite}
                  options={getAllSites()}
                />
              </div>
              <div className="col edit-field">
                <p className="edit-field__label">Billing Profiles</p>
                <Select
                  required
                  classNamePrefix="select"
                  className="edit-field__select"
                  placeholder="Choose Profile"
                  components={{ DropdownIndicator }}
                  styles={colourStyles}
                  value={editProfile}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PROFILE)}
                  options={this.buildProfileOptions()}
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
                  styles={colourStyles}
                  value={editSizes}
                  onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)}
                  options={getAllSizes()}
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
                  required={editAccountFieldDisabled}
                  disabled={editAccountFieldDisabled}
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
                  required={editAccountFieldDisabled}
                  disabled={editAccountFieldDisabled}
                />
              </div>
            </div>
            <div className="row row--end">
              <div className="col action">
                <button
                  className="action__button action__button--save"
                  tabIndex={0}
                  onKeyPress={() => {}}
                  onClick={() => { this.saveTask(); }}
                >
                  Save
                </button>
              </div>
              <div className="col action">
                <button
                  className="action__button action__button--cancel"
                  tabIndex={0}
                  onKeyPress={() => {}}
                  onClick={() => { this.cancelEdits(); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  renderTableRowStartActionButton() {
    const { task, onStartTask, proxies } = this.props;
    return TaskRow.renderTableRowActionButton(
      'Start Task',
      start,
      task.status === 'running' ? 'active' : '',
      () => { onStartTask(task, proxies); },
    );
  }

  renderTableRowStopActionButton() {
    const { task, onStopTask } = this.props;
    return TaskRow.renderTableRowActionButton(
      'Stop Task',
      stop,
      task.status === 'stopped' ? 'active' : '',
      () => { onStopTask(task); },
    );
  }

  renderTableRowDestroyActionButton() {
    const { task, onDestroyTask } = this.props;
    return TaskRow.renderTableRowActionButton(
      'Destroy Task',
      destroy,
      '',
      () => { onDestroyTask(task); },
    );
  }

  renderTableRowEditButton() {
    const { task } = this.props;
    return TaskRow.renderTableRowButton(
      'Edit Task',
      edit,
      task.status === 'editing' ? 'active' : '',
      () => { this.selectTask(task); },
    );
  }

  renderTableRow() {
    const { task } = this.props;
    let taskAccountValue = 'None';
    if (task.username !== null && task.password !== null) {
      taskAccountValue = task.username;
    }
    return (
      <div key={task.id} className="tasks-row row">
        <div className="col col--no-gutter tasks-edit">
          {this.renderTableRowEditButton()}
        </div>
        <div className="col col--no-gutter tasks-row__id">{task.id < 10 ? `0${task.id}` : task.id}</div>
        <div className="col col--no-gutter tasks-row__product">{task.product.raw}</div>
        <div className="col col--no-gutter tasks-row__sites">{task.site.name}</div>
        <div className="col col--no-gutter tasks-row__profile">{task.profile.profileName}</div>
        <div className="col col--no-gutter tasks-row__sizes">{task.sizes}</div>
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
        { this.renderTableRow() }
        { this.renderEditMenu() }
      </div>
    );
  }
}

TaskRow.propTypes = {
  // errors: PropTypes.objectOf(PropTypes.any).isRequired,
  isEditing: PropTypes.bool.isRequired,
  selectedTask: PropTypes.objectOf(PropTypes.any).isRequired, // TODO: use defns
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired, // TODO: use defns
  task: PropTypes.objectOf(PropTypes.any).isRequired, // TODO: use defns
  edits: PropTypes.objectOf(PropTypes.any).isRequired, // TODO: use defns
  onSelectTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onCommitEdits: PropTypes.func.isRequired,
  onCancelEdits: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  proxies: state.settings.proxies,
  errors: ownProps.task.errors,
  task: ownProps.task,
  edits: ownProps.task.edits,
  selectedTask: state.selectedTask,
  isEditing: ownProps.task.id === state.selectedTask.id,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes) => {
    dispatch(taskActions.edit(ownProps.task.id, changes.field, changes.value));
  },
  onEditTask: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
  onCancelEdits: (task) => {
    dispatch(taskActions.clearEdits(task.id, task));
  },
  onCommitEdits: (task) => {
    dispatch(taskActions.update(task.id, task));
  },
  onSelectTask: (task) => {
    dispatch(taskActions.select(task));
  },
  onUpdateTask: (task) => {
    dispatch(taskActions.update(task.id, task));
  },
  onStartTask: (task, proxies) => {
    dispatch(taskActions.start(task, proxies));
  },
  onStopTask: (task) => {
    dispatch(taskActions.stop(task));
  },
  onDestroyTask: (task) => {
    dispatch(taskActions.destroy(task.id));
  },
});


export default connect(mapStateToProps, mapDispatchToProps)(TaskRow);
