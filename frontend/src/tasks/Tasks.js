import React, { Component } from 'react';
import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import submit from '../_assets/submit.svg';
import '../App.css';
import './Tasks.css';

class Tasks extends Component {
    state = {tasks: []};
    task_num = 0;

    constructor(props) {
        super(props);
        this.getTasks = this.getTasks.bind(this);
        this.createTask = this.createTask.bind(this);
    }

    createTask(e) {
        // save task data to user's tasks and show it in 'view tasks' panel
        e.preventDefault();
        const
            bill_id = document.getElementById('billings'),
            size_id = document.getElementById('size');
        /*grab current values*/
        const
            sku = document.getElementById('sku').value,
            size = size_id.options[size_id.selectedIndex].text,
            billings = bill_id.options[bill_id.selectedIndex].text,
            num_pairs = document.getElementById('num_pairs').value;

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
            .then(res => console.log(res));
        /*increase task num*/
        this.task_num++;
    }

    getTasks(e) {
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
    }

    viewTasks() {
        // get tasks and display them
    }

    exportTasks() {
        // send current tasks to json file
    }

    importTasks() {
        // load json file to current tasks and display them
    }

    runTask() {
        // if user clicks the play button, start the task
    }

    stopTask() {
        // if user clicks pause button, stop the task
    }

    destroyTask() {
        // if user clicks the garbage can button, erase the task from tasks
    }

    /* MORE HELPERS HERE IF NEED */

    render() {
        return (
            <div className="container">
                <h1 className="text-header" id="task-header">Tasks</h1>
                <div className="flex-container">
                    {/*CREATE TASK*/}
                        <p className="body-text" id="create-label">Create</p>
                        <div id="create-box" />
                        <p id="sku-label">Input SKU</p>
                        <input id="sku" type="text" placeholder="SKU 000000000" required />
                        <p id="profiles-label">Billing Profiles</p>
                        <select id="profiles" type="text" required />
                        <div id="dropdown-profiles-box" />
                        <img src={DDD} id="dropdown-profiles-arrow" />
                        <p id="size-label">Sizes</p>
                        <select id="size" type="text" required />
                        <img src={DDD} id="dropdown-size-arrow" />
                        <p id="pairs-label"># Pairs</p>
                        <input id="pairs" type="text" placeholder="00" required />
                        <button id="submit" onClick={this.createTask} >Submit</button>
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
                    {/*TODO - add in actions*/}
                    <p id="view-num">#</p>
                    <p id="view-product">Product</p>
                    <p id="view-size">Size</p>
                    <p id="view-billings">Billings</p>
                    <p id="view-pairs"># Pairs</p>
                    <p id="view-actions">Actions</p>
                    <hr id="view-line" />
                    {/*END VIEW TASK*/}
                </div>
            </div>
        );
    }
}

export default Tasks;