import React, { Component } from 'react';
import ScrollableFeed from 'react-scrollable-feed';
import { connect } from 'react-redux';
import TaskRow from './taskRow';

import defns from '../utils/definitions/taskDefinitions';

export class ViewTaskPrimitive extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const { tasks } = this.props;
    return (
      <ScrollableFeed>
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ScrollableFeed>
    );
  }

  render() {
    return <div className="tasks-table">{this.createTable()}</div>;
  }
}

ViewTaskPrimitive.propTypes = {
  tasks: defns.taskList.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks,
});

export default connect(mapStateToProps)(ViewTaskPrimitive);
