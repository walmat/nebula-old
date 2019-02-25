import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import ViewTask from './viewTask';
import LogTask from './logTask';
import CreateTask from './createTask';
import { taskActions } from '../state/actions';
import sDefns from '../utils/definitions/settingsDefinitions';
import tDefns from '../utils/definitions/taskDefinitions';

import addTestId from '../utils/addTestId';
import renderSVGIcon from '../utils/renderSVGIcon';

import { ReactComponent as StartAllIcon } from '../_assets/start-all.svg';
import { ReactComponent as StopAllIcon } from '../_assets/stop-all.svg';
import { ReactComponent as DestroyAllIcon } from '../_assets/destroy-all.svg';

import '../app.css';
import './tasks.css';

export class TasksPrimitive extends Component {
  startAllTasks() {
    const { tasks, proxies, onStartTask } = this.props;
    tasks.forEach(t => onStartTask(t, proxies));
  }

  stopAllTasks() {
    const { tasks, onStopTask } = this.props;
    tasks.forEach(t => onStopTask(t));
  }

  destroyAllTasks() {
    const { tasks, onDestroyTask } = this.props;
    tasks.forEach(t => onDestroyTask(t));
  }

  render() {
    const { newTask, onKeyPress } = this.props;
    return (
      <div className="container tasks">
        <div className="row">
          <div className="col col--start">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <h1 className="text-header tasks__title">Tasks</h1>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="row row--start">
                  <div className="col col--no-gutter-left">
                    <p className="body-text section-header tasks-create__section-header">Create</p>
                  </div>
                </div>
                <div className="row">
                  <div className="col col--no-gutter-left">
                    <CreateTask taskToEdit={newTask} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col col--start">
            <div className="row row--start">
              <div className="col">
                <p className="body-text section-header section-header--no-top tasks-log__section-header">
                  Log
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col col--start tasks-log-container">
                <div className="tasks-log">
                  <div className="row row--start row--gutter-left row--gutter-right tasks-log__header">
                    <div className="col tasks-log__header--id">
                      <p>#</p>
                    </div>
                    <div className="col tasks-log__header--site">
                      <p>Site</p>
                    </div>
                    <div className="col tasks-log__header--size">
                      <p>Size</p>
                    </div>
                    <div className="col tasks-log__header--output">
                      <p>Output</p>
                    </div>
                  </div>
                  <div className="row row--start tasks-log__view-line">
                    <div className="col col--expand">
                      <hr className="view-line" />
                    </div>
                  </div>
                  <div className="row row--expand">
                    <div className="col tasks-table__wrapper">
                      <LogTask />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start">
          <div className="col col--start">
            <div className="row row--start">
              <p className="body-text section-header tasks-table__section-header">View</p>
            </div>
            <div className="row row--expand">
              <div className="col col--start tasks-table-container">
                <div className="row tasks-table__header">
                  <div className="col tasks-table__header__edit" />
                  <div className="col tasks-table__header__id">
                    <p>#</p>
                  </div>
                  <div className="col tasks-table__header__product">
                    <p>Product</p>
                  </div>
                  <div className="col tasks-table__header__sites">
                    <p>Site</p>
                  </div>
                  <div className="col tasks-table__header__profile">
                    <p>Billing Profile</p>
                  </div>
                  <div className="col tasks-table__header__sizes">
                    <p>Sizes</p>
                  </div>
                  <div className="col tasks-table__header__pairs">
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
                <div className="row row--expand row--start">
                  <div className="col tasks-table__wrapper">
                    <ViewTask />
                  </div>
                </div>
              </div>
              <div className="col col--start bulk-action-sidebar">
                <div className="row">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => {
                      this.startAllTasks();
                    }}
                    data-testid={addTestId('Tasks.bulkActionButton.start')}
                  >
                    {renderSVGIcon(StartAllIcon, { alt: 'start all' })}
                  </div>
                </div>
                <div className="row">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => {
                      this.stopAllTasks();
                    }}
                    data-testid={addTestId('Tasks.bulkActionButton.stop')}
                  >
                    {renderSVGIcon(StopAllIcon, { alt: 'stop all' })}
                  </div>
                </div>
                <div className="row">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={onKeyPress}
                    onClick={() => {
                      this.destroyAllTasks();
                    }}
                    data-testid={addTestId('Tasks.bulkActionButton.destroy')}
                  >
                    {renderSVGIcon(DestroyAllIcon, { alt: 'destroy all' })}
                  </div>
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
  newTask: tDefns.task.isRequired,
  tasks: tDefns.taskList.isRequired,
  proxies: PropTypes.arrayOf(sDefns.proxy).isRequired,
  onDestroyTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

TasksPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  newTask: state.newTask,
  tasks: state.tasks,
  proxies: state.settings.proxies,
});

export const mapDispatchToProps = dispatch => ({
  onDestroyTask: task => {
    dispatch(taskActions.destroy(task, 'all'));
  },
  onStartTask: (task, proxies) => {
    dispatch(taskActions.start(task, proxies));
  },
  onStopTask: task => {
    dispatch(taskActions.stop(task));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TasksPrimitive);
