import React, { Component } from 'react';
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
    return tasks.map(task => <TaskRow key={task.id} task={task} />);
  }

  renderViewTable() {}

  render() {
    const { fullscreen } = this.props;
    return (
      !fullscreen ? (<div className="tasks-table">{this.createTable()}</div>) : null
    );
  }
}

ViewTaskPrimitive.propTypes = {
  tasks: defns.taskList.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  tasks: state.tasks,
  fullscreen: ownProps.fullscreen,
});

export default connect(mapStateToProps)(ViewTaskPrimitive);
