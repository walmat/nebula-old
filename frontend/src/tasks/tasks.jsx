import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import ViewTask from './viewTask';
import LogTask from './logTask';
import CreateTask from './createTask';

import startAll from '../_assets/start-all.svg';
import stopAll from '../_assets/stop-all.svg';
import destroyAll from '../_assets/destroy-all.svg';

import '../app.css';
import './tasks.css';
import { taskActions } from '../state/actions';

import defns from '../utils/definitions/taskDefinitions';

class Tasks extends Component {
  onTaskChange(event) {
    const taskId = event.target.value;
    const { tasks } = this.props;
    const selectedTask = tasks.find(t => t.id === taskId);
    this.props.onSelectTask(selectedTask);
  }

  startAllTasks() {
    for (let i = 0; i < this.props.tasks.length; i += 1) {
      this.props.onStartTask(this.props.tasks[i]);
    }
  }

  stopAllTasks() {
    for (let i = 0; i < this.props.tasks.length; i += 1) {
      this.props.onStopTask(this.props.tasks[i]);
    }
  }

  destroyAllTasks() {
    // if user clicks the large `garbage can` button, erase all tasks
    for (let i = 0; i < this.props.tasks.length; i += 1) {
      this.props.onDestroyTasks(this.props.tasks[i]);
    }
  }

  render() {
    const { newTask } = this.props;
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
                <p className="body-text section-header section-header--no-top tasks-log__section-header">Log</p>
              </div>
            </div>
            <div className="row">
              <div className="col col--start">
                <div className="tasks-log">
                  <div className="row row--start row--gutter-left row--gutter-right tasks-log__header">
                    <div className="col tasks-log__header__id">
                      <p>#</p>
                    </div>
                    <div className="col tasks-log__header__site">
                      <p>Site</p>
                    </div>
                    <div className="col tasks-log__header__output">
                      <p>Output</p>
                    </div>
                  </div>
                  <div className="row row--start tasks-log__view-line">
                    <div className="col col--expand">
                      <hr className="view-line" />
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
                <div className="row row--start">
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
                    onKeyPress={() => {}}
                    onClick={() => { this.startAllTasks(); }}
                  >
                    <img src={startAll} alt="start all tasks" draggable="false" />
                  </div>
                </div>
                <div className="row">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={() => {}}
                    onClick={() => { this.stopAllTasks(); }}
                  >
                    <img src={stopAll} alt="stop all tasks" draggable="false" />
                  </div>
                </div>
                <div className="row">
                  <div
                    className="bulk-action-sidebar__button"
                    role="button"
                    tabIndex={0}
                    onKeyPress={() => {}}
                    onClick={() => { this.destroyAllTasks(); }}
                  >
                    <img src={destroyAll} alt="destroy all tasks" draggable="false" />
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

Tasks.propTypes = {
  tasks: defns.taskList.isRequired,
  newTask: defns.task.isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onDestroyTasks: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  tasks: state.tasks,
  newTask: state.newTask,
  selectedTask: state.selectedTask,
});

const mapDispatchToProps = dispatch => ({
  onLoadTask: (task) => {
    dispatch(taskActions.load(task));
  },
  onSelectTask: (task) => {
    dispatch(taskActions.select(task));
  },
  onUpdateTask: (task) => {
    dispatch(taskActions.update(task.editId, task));
  },
  onDestroyTasks: () => {
    dispatch(taskActions.destroy(null));
  },
  onStartTask: (task) => {
    dispatch(taskActions.start(task));
  },
  onStopTask: (task) => {
    dispatch(taskActions.stop(task));
  },
  onChangeField: (change, field, event) => {
    dispatch(taskActions.edit(null, field, event.target.value));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Tasks));
