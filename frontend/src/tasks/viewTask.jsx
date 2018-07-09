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
      table.push((
        <tr key={this.props.tasks[i].id}>
          <td id={`${this.props.tasks[i].id}-edit`}><img src={edit} alt="edit" /></td>
          <td id={`${this.props.tasks[i].id}-id`}>{this.props.tasks[i].id}</td>
          <td id={`${this.props.tasks[i].id}-sku`}>{this.props.tasks[i].sku}</td>
          <td id={`${this.props.tasks[i].id}-profile`}>{this.props.tasks[i].profile.profileName}</td>
          <td id={`${this.props.tasks[i].id}-sizes`}>{this.props.tasks[i].sizes}</td>
          <td id={`${this.props.tasks[i].id}-pairs`}>{this.props.tasks[i].pairs}</td>
          <td id={`${this.props.tasks[i].id}-run`}><img src={start} alt="start" /></td>
          <td id={`${this.props.tasks[i].id}-stop`}><img src={stop} alt="stop" /></td>
          <td id={`${this.props.tasks[i].id}-destroy`}><img src={destroy} alt="destroy" /></td>
        </tr>
      ));
    }
    return table;
  }

  render() {
    return (
      <table>{this.createTable()}</table>
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
