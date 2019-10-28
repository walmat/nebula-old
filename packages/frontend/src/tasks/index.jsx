import React, { PureComponent } from 'react';
import { parseURL } from 'whatwg-url';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';

import ViewTask from './components/viewTask';
import LogTask from './components/logTask';
import CreateTask from './components/createTask';
import { taskActions, SETTINGS_FIELDS, settingsActions } from '../state/actions';
import sDefns from '../state/definitions/settingsDefinitions';
import tDefns from '../state/definitions/taskDefinitions';

import { addTestId, renderSvgIcon } from '../utils';
import { buildStyle } from '../styles';

import { ReactComponent as StartAllIcon } from '../styles/images/tasks/start-all.svg';
import { ReactComponent as StopAllIcon } from '../styles/images/tasks/stop-all.svg';
import { ReactComponent as DestroyAllIcon } from '../styles/images/tasks/destroy-all.svg';

import '../styles/index.scss';
import './styles/index.scss';

export class TasksPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.delays = {
      [SETTINGS_FIELDS.EDIT_MONITOR_DELAY]: {
        className: 'col col--no-gutter tasks__delay--gutter-bottom',
        label: 'Monitor',
        placeholder: '3500',
        delayType: 'monitor',
      },
      [SETTINGS_FIELDS.EDIT_ERROR_DELAY]: {
        className: 'col col--end col--no-gutter',
        label: 'Error',
        placeholder: '3500',
        delayType: 'error',
      },
    };

    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.startAllTasks = this.startAllTasks.bind(this);
    this.stopAllTasks = this.stopAllTasks.bind(this);
    this.destroyAllTasks = this.destroyAllTasks.bind(this);
    this.renderDelay = this.renderDelay.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  componentDidMount() {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this._handleKeyDown);
  }

  createOnChangeHandler(field, event) {
    const { onSettingsChange } = this.props;
    return onSettingsChange({
      field,
      value: event.target.value,
    });
  }



  startAllTasks() {
    const { tasks, proxies, onStartAllTasks } = this.props;
    if (tasks.length && tasks.some(t => t.status !== 'running')) {
      onStartAllTasks(tasks, proxies);
    }
  }

  stopAllTasks() {
    const { tasks, onStopAllTasks } = this.props;
    if (tasks.length && tasks.some(t => t.status === 'running' || t.status === 'bypassed')) {
      onStopAllTasks(tasks);
    }
  }

  destroyAllTasks() {
    const { tasks, onDestroyAllTasks } = this.props;
    if (tasks.length) {
      onDestroyAllTasks(tasks);
    }
  }

  async _handleKeyDown(e) {
    const { keyCode } = e;

    if (window.Bridge) {
      switch (keyCode) {
        case 114: {
          // START ALL
          this.startAllTasks();
          break;
        }
        case 115: {
          // STOP ALL
          this.stopAllTasks();
          break;
        }
        case 116: {
          // MASS OVERRIDE LINK
          /**
           * 1. Get clipboard data
           * 2. Check if it's a valid link
           * 3. Change all tasks with the same site url to the new product data (edit task to show it as well)
           * 4. Start all newly changed tasks
           */
          const url = await navigator.clipboard.readText();
          const URL = parseURL(url);

          if (!URL || !URL.host || (URL.path && !URL.path[0])) {
            break;
          }

          const { tasks, onMassEdit } = this.props;

          const tasksToChange = tasks.filter(
            t => t.site.url.indexOf(URL.host) > -1 && t.status === 'running',
          );

          onMassEdit(tasksToChange, { url });
          break;
        }
        case 117: {
          // MASS OVERRIDE PW
          /** TODO:
           * 1. Get clipboard data
           * 2. Send window.Bridge event with data
           * 3. on task-runner side, check to see which tasks are needing a password somehow
           */
          const password = await navigator.clipboard.readText();

          if (!password) {
            break;
          }
          const { tasks, onMassEdit } = this.props;
          onMassEdit(tasks, { password });
          break;
        }
        default:
          break;
      }
    }
  }

  renderDelay(field, value) {
    const { className, delayType, label, placeholder } = this.delays[field];
    return (
      <div className={className}>
        <p className="tasks__label">{label}</p>
        <NumberFormat
          value={value}
          placeholder={placeholder}
          className={`bulk-action-sidebar__${delayType}-delay`}
          style={buildStyle(false)}
          onChange={e => this.createOnChangeHandler(field, e)}
          required
        />
      </div>
    );
  }

  render() {
    const { errorDelay, monitorDelay, onKeyPress } = this.props;
    return (
      <div className="container tasks">
        <div className="row row--expand" style={{ width: '100%' }}>
          <div className="col col--expand col--start" style={{ flexGrow: 0.5 }}>
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <h1 className="text-header tasks__title">Tasks</h1>
              </div>
            </div>
            <div className="row row--expand">
              <div className="col col--expand">
                <div className="row row--start">
                  <div className="col col--no-gutter-left">
                    <p className="body-text section-header tasks-create__section-header">Create</p>
                  </div>
                </div>
                <div className="row row--expand">
                  <div className="col col--start col--expand col--no-gutter-left">
                    <CreateTask />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col col--expand col--start" style={{ flexGrow: 5 }}>
            <LogTask />
          </div>
        </div>
        <div className="row row--expand row--start" style={{ width: '100%' }}>
          <div className="col col--expand col--start">
            <div className="row row--start">
              <p className="body-text section-header tasks-table__section-header">View</p>
            </div>
            <div className="row row--start row--expand">
              <div className="col col--expand col--start tasks-table-container">
                <div className="row row--start row--no-gutter tasks-table__header">
                  <div className="col tasks-table__header__edit" />
                  <div className="col tasks-table__header__id">
                    <p>#</p>
                  </div>
                  <div className="col tasks-table__header__product">
                    <p>Product / Variation</p>
                  </div>
                  <div className="col tasks-table__header__sites">
                    <p>Site</p>
                  </div>
                  <div className="col tasks-table__header__profile">
                    <p>Billing Profile</p>
                  </div>
                  <div className="col tasks-table__header__sizes">
                    <p>Size</p>
                  </div>
                  <div className="col tasks-table__header__account">
                    <p>Account</p>
                  </div>
                  <div className="col tasks-table__header__actions">
                    <p>Actions</p>
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col col--expand">
                    <hr className="view-line" />
                  </div>
                </div>
                <div className="row row--gutter row--expand row--start">
                  <div className="col col--no-gutter tasks-table__wrapper">
                    <ViewTask />
                  </div>
                </div>
              </div>
              <div className="col col--start bulk-action-sidebar">
                <div className="row row--start">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => this.startAllTasks()}
                    data-testid={addTestId('Tasks.bulkActionButton.start')}
                  >
                    {renderSvgIcon(StartAllIcon, { alt: 'start all' })}
                  </div>
                </div>
                <div className="row row--start">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => this.stopAllTasks()}
                    data-testid={addTestId('Tasks.bulkActionButton.stop')}
                  >
                    {renderSvgIcon(StopAllIcon, { alt: 'stop all' })}
                  </div>
                </div>
                <div className="row row--start">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => this.destroyAllTasks()}
                    data-testid={addTestId('Tasks.bulkActionButton.destroy')}
                  >
                    {renderSvgIcon(DestroyAllIcon, { alt: 'destroy all' })}
                  </div>
                </div>
                <div className="row row--start">
                  {this.renderDelay(SETTINGS_FIELDS.EDIT_MONITOR_DELAY, monitorDelay)}
                </div>
                <div className="row row--start">
                  {this.renderDelay(SETTINGS_FIELDS.EDIT_ERROR_DELAY, errorDelay)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

TasksPrimitive.propTypes = {
  monitorDelay: PropTypes.number.isRequired,
  errorDelay: PropTypes.number.isRequired,
  tasks: tDefns.taskList.isRequired,
  proxies: PropTypes.arrayOf(sDefns.proxy).isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  onMassEdit: PropTypes.func.isRequired,
  onDestroyAllTasks: PropTypes.func.isRequired,
  onStartAllTasks: PropTypes.func.isRequired,
  onStopAllTasks: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

TasksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  monitorDelay: state.settings.monitorDelay,
  errorDelay: state.settings.errorDelay,
  tasks: state.tasks,
  proxies: state.settings.proxies,
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
  onDestroyAllTasks: tasks => {
    dispatch(taskActions.destroyAll(tasks));
  },
  onStartAllTasks: (tasks, proxies) => {
    dispatch(taskActions.startAll(tasks, proxies));
  },
  onStopAllTasks: tasks => {
    dispatch(taskActions.stopAll(tasks));
  },
  onMassEdit: (tasks, edits) => {
    dispatch(taskActions.editAll(tasks, edits));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TasksPrimitive);
