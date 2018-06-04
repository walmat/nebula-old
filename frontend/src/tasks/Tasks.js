import React, { Component } from 'react';
import ViewTask from './view-task';
import CreateTask from './CreateTask';

import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import startAll from '../_assets/start-all.svg';
import stopAll from '../_assets/stop-all.svg';
import destroyAll from '../_assets/destroy-all.svg';

import '../App.css';
import './Tasks.css';

const config = require('./config.json'); //TODO *** temp data structure
const core = require('core');
const Pool = require('threads').Pool;

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

    constructor(props) {
        super(props);
        this.state = {
            tasks: []
        };
        this.getTasks = this.getTasks.bind(this);
    }

    createTask = async (e) => {
        // save task data to user's tasks and show it in 'view tasks' panel
        e.preventDefault();
        const bill_id = document.getElementById('profiles');
        const size_id = document.getElementById('size');

        const sku = document.getElementById('sku').value;
        const size = size_id.options[size_id.selectedIndex].text;
        const billings = bill_id.options[bill_id.selectedIndex].text;
        const num_pairs = document.getElementById('num_pairs').value;


        /*Store the task in the db*/
        fetch('http://localhost:8080/tasks',
            {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({"task_num":this.task_num, "status": "idle", "sku": sku,"size": size, "billings": billings, "num_pairs": num_pairs})
            })
            .then(res => {
                this.setState();
                this.state.tasks.push(JSON.stringify(res.body));
                this.task_num++;
            });
    };

    getTasks = async (e) => {
        e.preventDefault();
        fetch('http://localhost:8080/tasks',
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET",
                body: {}
            })
            .then(res => res.json())
            .then(tasks => this.setState({tasks}));
    };

    runTask = async (index) => {
        // if user clicks the play button, start the task
        // core.run(this.state.tasks[index]);
        //TODO setup threading
        core.run(config);
    };

    stopTask = async () => {
        // if user clicks pause button, stop the task
    };

    destroyTask = async () => {
        // if user clicks the `garbage can` button, erase the task from tasks
    };

    editTask = async () => {
        //expand the task dialog and look for changes
    };

    /**
     * if user clicks the large `right arrow` button, run all the tasks
     */
    startAllTasks = async () => {
        const pool = new Pool(); //ceate a new thread pool
        //TODO – create thread for each task and run it

    };

    stopAllTasks = async () => {
        // if user clicks the large `x` button, stop all tasks
    };

    destroyAllTasks = async () => {
        // if user clicks the large `garbage can` button, erase all tasks
    };

    /* MORE HELPERS HERE IF NEED */

    toggleSVG = async (state) => {
        //based on the state of the <select> tags, change the src of the img
    };

    render() {
        return (
            <div className="container">
                <h1 className="text-header" id="task-header">Tasks</h1>
                <div className="flex-container">
                    {/*CREATE TASK*/}

                    <CreateTask/>

                    {/*END CREATE TASK*/}

                    {/*TASK LOG*/}
                        <p className="body-text" id="log-label">Log</p>
                        <div id="log-box" />
                        {/*TODO - add in actions*/}
                        <p id="log-num">#</p>
                        <p id="log-site">Site</p>
                        <p id="log-output">Output</p>
                        <hr id="log-line" />
                    {/*END TASK LOG*/}

                    {/*VIEW TASK*/}
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
                        { this.state.tasks.forEach((task) => {return <ViewTask data={task} />}) }
                    </div>
                    <img src={startAll} id="start-all" onClick={this.startAllTasks} draggable="false" />
                    <img src={stopAll} id="stop-all" onClick={this.stopAllTasks} draggable="false" />
                    <img src={destroyAll} id="destroy-all" onClick={this.destroyAllTasks} draggable="false" />
                    {/*END VIEW TASK*/}
                </div>
            </div>
        );
    }
}

export default Tasks;