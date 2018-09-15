import React, { Component } from 'react';
import { connect } from 'react-redux';
import TaskRow from './taskRow';
import { taskActions } from '../state/actions';

import defns from '../utils/definitions/taskDefinitions';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const table = this.props.tasks.map(task => (<TaskRow key={task.id} task={task} />));
    return table;
  }

  render() {
    return (
      <div className="tasks-table">
        {this.createTable()}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  tasks: state.tasks,
});

const mapDispatchToProps = dispatch => ({
  onChange: (task, changes) => {
    dispatch(taskActions.edit(task.id, changes.field, changes.value));
  },
});

ViewTask.propTypes = {
  tasks: defns.taskList.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
