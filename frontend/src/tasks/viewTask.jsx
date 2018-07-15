import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import start from '../_assets/run.svg';
import line from '../_assets/horizontal-line.svg';
import stop from '../_assets/stop.svg';
import destroy from '../_assets/destroy.svg';
import edit from '../_assets/edit_icon.svg';

class ViewTask extends Component {

  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.editTask = this.editTask.bind(this);
    this.startTask = this.startTask.bind(this);
  }

  startTask(task) {
    console.log('starting task: ', task.id);
  }

  editTask(task) {
    console.log('editing task: ', task.id);
  }

  stopTask(task) {
    console.log('stopping task: ', task.id);
  }

  destroyTask(task) {
    console.log('destroying task: ', task.id);
  }

  createTable() {
    const table = [];

    for (let i = 0; i < this.props.tasks.length; i += 1) {
      table.push((
        <tr key={this.props.tasks[i].id} className="tasks_row">
          <td className="blank" />
          <td className="tasks_edit"><img src={edit} onClick={() => {this.editTask(this.props.tasks[i])}} alt="edit" /></td>
          <td className="tasks_id">{this.props.tasks[i].id}</td>
          <td className="tasks_sku">SKU {this.props.tasks[i].sku}</td>
          <td className="tasks_profile">{this.props.tasks[i].profile.profileName}</td>
          <td className="tasks_sizes">{this.props.tasks[i].sizes}</td>
          <td className="tasks_pairs">{this.props.tasks[i].pairs}</td>
          <td className="tasks_start"><img src={start} onClick={() => {this.startTask(this.props.tasks[i])}} alt="start" /></td>
          <td className="tasks_stop"><img src={stop} onClick={() => {this.stopTask(this.props.tasks[i])}} alt="stop" /></td>
          <td className="tasks_destroy"><img src={destroy} onClick={() => {this.destroyTask(this.props.tasks[i])}} alt="destroy" /></td>
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
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewTask);
