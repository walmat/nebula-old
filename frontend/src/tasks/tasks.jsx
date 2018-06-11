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

// const config = require('./config.json'); // TODO *** temp data structure
// const core = require('core');
// const Pool = require('threads').Pool;

class Tasks extends Component {
  /*
  * {
  *   edit: edit_img,
  *   task_num: task_num,
  *   sku: sku,
  *   profiles: profiles,
  *   sizes: sizes,
  *   num_pairs: num_pairs,
  *   actions: [
  *       run: run_img,
  *       stop: stop_img,
  *       destroy: destroy_img
  *   ]
  * }
  * */

  /**
   * if user clicks the large `right arrow` button, run all the tasks
   */
  static async startAllTasks() {
    // const pool = new Pool(); //ceate a new thread pool
    // TODO – create thread for each task and run it
  }

  static async stopAllTasks() {
    // if user clicks the large `x` button, stop all tasks
  }

  static async destroyAllTasks() {
    // if user clicks the large `garbage can` button, erase all tasks
  }


  static async createTask(e) {
    // TODO: Move this to middleware
    // // save task data to user's tasks and show it in 'view tasks' panel
    // e.preventDefault();
    // const bill_id = document.getElementById('profiles');
    // const size_id = document.getElementById('size');

    // const sku = document.getElementById('sku').value;
    // //const size = size_id.options[size_id.selectedIndex].text;
    // //const billings = bill_id.options[bill_id.selectedIndex].text;
    // const num_pairs = document.getElementById('pairs').value;

    // const size = '8.5';
    // const billings = 'profile 1';


    // /*Store the task in the db*/
    // await fetch('http://localhost:8080/tasks', {
    //     method: "POST",
    //     headers: {
    //       'Accept': 'application/json',
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       "task_num": this.task_num,
    //       "status": "idle",
    //       "sku": sku,
    //       "size": size,
    //       "billings": billings,
    //       "num_pairs": num_pairs
    //     })
    //   })
    //   .then(res => {
    //     this.setState();
    //     this.state.tasks.push(JSON.stringify(res.body));
    //     this.task_num++;
    //   });
  }

  static async getTasks(e) {
    // TODO: Move to middlware
    // e.preventDefault();
    // await fetch('http://localhost:8080/tasks', {
    //     headers: {
    //       'Accept': 'application/json',
    //       'Content-Type': 'application/json'
    //     },
    //     method: "GET",
    //     body: {}
    //   })
    //   .then(res => res.json())
    //   .then(tasks => this.setState({
    //     tasks
    //   }));
  }

  // async runTask(index) {
  // // if user clicks the play button, start the task
  // // core.run(this.state.tasks[index]);
  // // TODO setup threading
  // // core.run(config);
  // };

  // async stopTask() {
  // // if user clicks pause button, stop the task
  // }

  // async destroyTask() {
  // // if user clicks the `garbage can` button, erase the task from tasks
  // }

  // async editTask() {
  // //expand the task dialog and look for changes
  // }

  /* MORE HELPERS HERE IF NEED */

  // async toggleSVG(state) {
  // //based on the state of the <select> tags, change the src of the img
  // }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="task-header">Tasks</h1>
        <div className="flex-container">
          {/* CREATE TASK */}
          <CreateTask />

          {/* END CREATE TASK */}

          {/* TASK LOG */}
          <p className="body-text" id="log-label">Log</p>
          <div id="log-box" />
          {/* TODO - add in actions */}
          <p id="log-num">#</p>
          <p id="log-site">Site</p>
          <p id="log-output">Output</p>
          <hr id="log-line" />
          {/* END TASK LOG */}

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
              {this.props.tasks.forEach(task => <ViewTask data={task} />)}
            </table>
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
            onClick={this.destroyAllTasks}
          >
            <img src={destroyAll} alt="destroy all tasks" id="destroy-all" draggable="false" />
          </div>
          {/* END VIEW TASK */}
        </div>
      </div>
    );
  }
}

Tasks.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  tasks: state.tasks,
});

export default connect(mapStateToProps)(Tasks);
