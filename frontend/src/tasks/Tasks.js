import React, { Component } from 'react';
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
        /*grab current values*/
        const
            sku = document.getElementById('sku').innerHTML,
            size = document.getElementById('size').innerHTML,
            billings = document.getElementById('billings').innerHTML,
            num_pairs = document.getElementById('num_pairs').innerHTML;
        /*Store the task in the db*/
        fetch('/tasks',
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: {"task_num":this.task_num, "sku": sku,"size": size, "billings": billings, "num_pairs": num_pairs}
            })
            .then(res => res.json())
            .then(tasks => this.setState({tasks}));

        /*increase task num*/
        this.task_num++;
    }

    getTasks(e) {
        e.preventDefault();
        fetch('/tasks',
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
                <div className="flex-container">
                    <div className="flex-col">
                        {/*create task*/}
                        <div className="flex-row" id="create-row">
                            <h5 id="create-task-header">CREATE TASK</h5>
                            <form id="form-create" className="topBefore" onSubmit={this.createTask}>
                                <div className="flex-row">
                                    <input id="sku" type="text" placeholder="ENTER PRODUCT CODE / SKU"></input>
                                </div>
                                <div className="flex-row">
                                    <select id="size">
                                        <option value="" selected disabled hidden>Size Options</option>
                                        <option>8.0</option>
                                        <option>8.5</option>
                                        <option>9.0</option>
                                    </select>
                                    <select id="billings">
                                        <option value="" selected disabled hidden>Billing Profile</option>
                                        <option>billing 1</option>
                                        <option>billing 2</option>
                                        <option>billing 3</option>
                                    </select>
                                </div>
                                <div className="flex-row">
                                    <input id="num_pairs" type="text" placeholder="NUMBER OF PAIRS"></input>
                                </div>
                                <div className="flex-row">
                                    <input id="submit" type="submit"></input>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="flex-col">
                        {/*view task*/}
                        <div className="flex-row" id="view-row">
                            <h5 id="view-task-header">VIEW TASKS</h5>
                            <table id="tasks-table">
                                <tr>
                                    <th>#</th>
                                    <th>STATUS</th>
                                    <th>SKU</th>
                                    <th>PAIRS</th>
                                </tr>
                                {this.state.tasks.map(task =>
                                    <td key={task.num}>{task.username}</td>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Tasks;