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
  }

  createTable() {
    const table = [];

    console.log(this.props.tasks);

    for (let i = 0; i < this.props.tasks.length; i += 1) {
      // if (i !== 0) {
      //   table.push(<tr><img src={line} alt="line" /> </tr>);
      // }
      table.push((
        <tr key={this.props.tasks[i].id}>
          <td className="tasks_edit"><img src={edit} alt="edit" /></td>
          <td className="tasks_id">{this.props.tasks[i].id}</td>
          <td className="tasks_sku">{this.props.tasks[i].sku}</td>
          <td className="tasks_profile">{this.props.tasks[i].profile.profileName}</td>
          <td className="tasks_sizes">{this.props.tasks[i].sizes}</td>
          <td className="tasks_pairs">{this.props.tasks[i].pairs}</td>
          <td className="tasks_start"><img src={start} alt="start" /></td>
          <td className="tasks_stop"><img src={stop} alt="stop" /></td>
          <td className="tasks_destroy"><img src={destroy} alt="destroy" /></td>
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
