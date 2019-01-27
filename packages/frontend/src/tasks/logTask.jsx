import React, { Component } from 'react';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';

export class LogTaskPrimitive extends Component {
  createTable() {
    const { tasks } = this.props;
    const runningTasks = tasks.filter(task => task.status === 'running');
    const table = runningTasks.map(t => <LogTaskRow key={t.index} task={t} />);
    return table;
  }

  render() {
    return <div className="tasks-table">{this.createTable()}</div>;
  }
}

LogTaskPrimitive.propTypes = {
  tasks: tDefns.taskList.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks,
});

export default connect(mapStateToProps)(LogTaskPrimitive);
