import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';

import ViewTask from './viewTask';
import CreateTask from './createTask';

import startAll from '../_assets/start-all.svg';
import stopAll from '../_assets/stop-all.svg';
import destroyAll from '../_assets/destroy-all.svg';

import '../app.css';
import './tasks.css';
import { taskActions } from '../state/actions';

// const config = require('./config.json'); // TODO *** temp data structure
// const core = require('core');
// const Pool = require('threads').Pool;

class Tasks extends Component {
  /**
   * if user clicks the large `right arrow` button, run all the tasks
   */
  static async startAllTasks() {
    // const pool = new Pool(); //ceate a new thread pool
    // TODO – create thread for each task and "run" it
  }

  static async stopAllTasks() {
    // if user clicks the large `x` button, stop all tasks
  }

  componentDidUpdate() {
    console.log('UPDATE');
  }

  /* changes when the edit button for each task is clicked */
  async onTaskChange(event) {
    const taskId = event.target.value;
    const { tasks } = this.props;
    const selectedTask = tasks.find(t => t.id === taskId);

    this.props.onSelectTask(selectedTask);
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
        <h1 className="text-header" id="task-header">Tasks</h1>
        <div className="flex-container">
          {/* CREATE TASK */}
          <CreateTask taskToEdit={newTask} />

          {/* TASK LOG */}
          <p className="body-text" id="log-label">Log</p>
          <div id="log-box" />
          <p id="log-num">#</p>
          <p id="log-site">Site</p>
          <p id="log-output">Output</p>
          <hr id="log-line" />

          {/* VIEW TASK */}
          <p className="body-text" id="view-label">View</p>
          <div id="view-box" />
          <p id="view-num">#</p>
          <p id="view-product">Product</p>
          <p id="view-size">Size</p>
          <p id="view-billings">Billings</p>
          <p id="view-pairs"># Pairs</p>
          <p id="view-actions">Actions</p>
          <hr id="view-line" />
          <div id="view-scroll-box">
            <ViewTask />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.startAllTasks}
          >
            <img src={startAll} alt="start all tasks" id="start-all" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.stopAllTasks}
          >
            <img src={stopAll} alt="stop all tasks" id="stop-all" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => { this.destroyAllTasks(); }}
          >
            <img src={destroyAll} alt="destroy all tasks" id="destroy-all" draggable="false" />
          </div>
        </div>
      </div>
    );
  }
}

Tasks.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  newTask: PropTypes.objectOf(PropTypes.any).isRequired,
  // selectedTask: PropTypes.objectOf(PropTypes.any).isRequired,
  // onAddNewTask: PropTypes.func.isRequired,
  // onLoadTask: PropTypes.func.isRequired,
  onSelectTask: PropTypes.func.isRequired,
  // onUpdateTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
  // onChangeField: PropTypes.func.isRequired
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
  onRemoveTask: (task) => {
    dispatch(taskActions.remove(task.id));
  },
  onChangeField: (change, field, event) => {
    dispatch(taskActions.edit(null, field, event.target.value));
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Tasks));
