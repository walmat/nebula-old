import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import ViewTask from './viewTask';
import CreateTask from './createTask';

// import DDD from '../_assets/dropdown-down.svg';
// import DDU from '../_assets/dropdown-up.svg';
import startAll from '../_assets/start-all.svg';
import stopAll from '../_assets/stop-all.svg';
import destroyAll from '../_assets/destroy-all.svg';

import '../app.css';
import './tasks.css';
import {TASK_FIELDS, mapTasksFieldToKey, taskActions} from "../state/actions";

// const config = require('./config.json'); // TODO *** temp data structure
// const core = require('core');
// const Pool = require('threads').Pool;

class Tasks extends Component {


  componentDidUpdate() {
    console.log('UPDATE');
  }
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

  static async destroyAllTasks() {
    // if user clicks the large `garbage can` button, erase all tasks
  }

  async runTask() {
    // if user clicks the play button, start the task
  };

  async stopTask() {
    // if user clicks pause button, stop the task
  }

  async destroyTask() {
    // if user clicks the `garbage can` button, erase the task from tasks
  }

  async loadTask() {
    this.props.onLoadTask(this.props.selectedTask);
  }

  /* changes when the edit button for each task is clicked */
  async onTaskChange(event) {
    const taskId = event.target.value;
    const {task} = this.props;
    const selectedTask = tasks.find(t => t.id === taskId);

    this.props.onSelectTask(selectedTask);
  }

  render() {
    const {currentTask} = this.props;
    return (
      <div className="container">
        <h1 className="text-header" id="task-header">Tasks</h1>
        <div className="flex-container">
          {/* CREATE TASK */}
          <CreateTask taskToEdit={currentTask}/>

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
            <table>
              {/*{this.props.tasks.forEach(task => <ViewTask data={task} />)}*/}
            </table>
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.startAllTasks}>
            <img src={startAll} alt="start all tasks" id="start-all" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.stopAllTasks}>
            <img src={stopAll} alt="stop all tasks" id="stop-all" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={this.destroyAllTasks}>
            <img src={destroyAll} alt="destroy all tasks" id="destroy-all" draggable="false" />
          </div>
        </div>
      </div>
    );
  }
}

Tasks.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentTask: PropTypes.objectOf(PropTypes.any).isRequired,
  selectedTask: PropTypes.objectOf(PropTypes.any).isRequired,
  onAddNewTask: PropTypes.func.isRequired,
  onLoadTask: PropTypes.func.isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onUpdateTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
  onChangeField: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
   tasks: state.tasks,
   currentTask: state.currentTask,
   selectedTask: state.selectedTask
});

const mapDispatchToProps = dispatch => ({
    onAddNewTask: (newTask) => {
      dispatch(taskActions.add(newTask));
    },
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
      dispatch(taskActions.remove(task));
    },
    onChangeField: (change, field, event) => {
      dispatch(taskActions.edit(null, field, event.target.value))
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Tasks);
