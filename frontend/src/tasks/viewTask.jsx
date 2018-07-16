import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import line from '../_assets/horizontal-line.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';

import defns from '../utils/definitions/taskDefinitions';

class ViewTask extends Component {
  static startTask(task) {
    console.log('starting task: ', task.id);
  }

  static editTask(task) {
    console.log('editing task: ', task.id);
  }

  static stopTask(task) {
    console.log('stopping task: ', task.id);
  }

  static destroyTask(task) {
    console.log('destroying task: ', task.id);
  }

  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const table = [];

    for (let i = 0; i < this.props.tasks.length; i += 1) {
      const task = this.props.tasks[i];
      table.push((
        <tr key={task.id} className="tasks_row">
          <td className="blank" />
          <td className="tasks_edit">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => ViewTask.editTask(task)}>
              <img src={edit} alt="edit" />
            </div>
          </td>
          <td className="tasks_id">{task.id}</td>
          <td className="tasks_sku">SKU {task.sku}</td>
          <td className="tasks_profile">{task.profile.profileName}</td>
          <td className="tasks_sizes">{task.sizes}</td>
          <td className="tasks_pairs">{task.pairs}</td>
          <td className="tasks_start">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => ViewTask.startTask(task)}>
              <img src={start} alt="start" />
            </div>
          </td>
          <td className="tasks_stop">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => ViewTask.stopTask(task)}>
              <img src={stop} alt="stop" />
            </div>
          </td>
          <td className="tasks_destroy">
            <div role="button" tabIndex={0} onKeyPress={() => {}} onClick={() => ViewTask.destroyTask(task)}>
              <img src={destroy} alt="destroy" />
            </div>
          </td>
          <td className="extend" />
        </tr>
      ));
    }
    return table;
  }

  render() {
    return (
      <table>
        <tbody>{this.createTable()}</tbody>
      </table>
    );
  }
}

const mapStateToProps = state => ({
  tasks: state.tasks,
});

const mapDispatchToProps = dispatch => ({

});

ViewTask.propTypes = {
  tasks: defns.taskList.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
