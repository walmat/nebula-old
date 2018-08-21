import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import ViewTask from './viewTask';
import CreateTask from './createTask1';

import startAll from '../_assets/start-all.svg';
import stopAll from '../_assets/stop-all.svg';
import destroyAll from '../_assets/destroy-all.svg';

import '../app.css';
import './tasks.css';
import './tasksTable.css';
import { taskActions } from '../state/actions';

class Tasks1 extends Component {
  // componentDidUpdate() {
  //   console.log('UPDATE');
  // }

  /* changes when the edit button for each task is clicked */
  async onTaskChange(event) {
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
      this.props.onRemoveTask(this.props.tasks[i]);
    }
  }

  render() {
    const { newTask } = this.props;
    return (
      <div className="container">
        <div className="row">
          <div className="col col--start">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <h1 className="text-header">Tasks</h1>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="row row--start">
                  <div className="col col--no-gutter-left">
                    <p className="body-text section-header">Create</p>
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
                <p className="body-text section-header section-header--no-top">Log</p>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="temp-log-box" />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--expand temp-table-row">
          <div className="col col--start">
            <div className="row row--start">
              <p className="body-text section-header">View</p>
            </div>
            <div className="row row--expand">
              <div className="col col--start tasks-table-container">
                <div className="row tasks-table__header">
                  { /* <div className="col tasks-table__header__edit" /> */}
                  <div className="col tasks-table__header__id">
                    <p>#</p>
                  </div>
                  <div className="col tasks-table__header__sku">
                    <p>Product</p>
                  </div>
                  <div className="col tasks-table__header__sites">
                    <p>Sites</p>
                  </div>
                  <div className="col tasks-table__header__profile">
                    <p>Billing Profile</p>
                  </div>
                  <div className="col tasks-table__header__sizes">
                    <p>Sizes</p>
                  </div>
                  <div className="col tasks-table__header__pairs">
                    <p># Pairs</p>
                  </div>
                  <div className="col tasks-table__header__actions">
                    <p>Actions</p>
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col">
                    <hr className="view-line" />
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col">
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

Tasks1.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  newTask: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
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
  onRemoveTask: () => {
    dispatch(taskActions.remove(null));
  },
  onStartTask: (task) => {
    dispatch(taskActions.start(task.id));
  },
  onStopTask: (task) => {
    dispatch(taskActions.stop(task.id));
  },
  onChangeField: (change, field, event) => {
    dispatch(taskActions.edit(null, field, event.target.value));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Tasks1));
