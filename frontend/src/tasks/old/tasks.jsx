import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../../EnsureAuthorization';

import ViewTask from './viewTask';
import CreateTask from './createTask';

import startAll from '../../_assets/start-all.svg';
import stopAll from '../../_assets/stop-all.svg';
import destroyAll from '../../_assets/destroy-all.svg';

import '../../app.css';
import './tasks.css';
import './tasksTable.css';
import { taskActions } from '../../state/actions';

import defns from '../../utils/definitions/taskDefinitions';

class Tasks extends Component {
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

  /* MORE HELPERS HERE IF NEED */

  // async toggleSVG(state) {
  // //based on the state of the <select> tags, change the src of the img
  // }

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
          <div id="log-scroll-box" />

          {/* VIEW TASK */}
          <p className="body-text" id="view-label">View</p>
          <div id="view-box" />
          <p id="view-num">#</p>
          <p id="view-product">Product</p>
          <p id="view-sites">Site</p>
          <p id="view-size">Size</p>
          <p id="view-billings">Billing Profile</p>
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
            onClick={() => { this.startAllTasks(); }}
          >
            <img src={startAll} alt="start all tasks" id="start-all" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => { this.stopAllTasks(); }}
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
  tasks: defns.taskList.isRequired,
  newTask: defns.task.isRequired,
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

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Tasks));
