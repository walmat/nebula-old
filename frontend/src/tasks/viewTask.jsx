import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const tableRow = [];

    for (let i = 0; i < this.props.data.length; i += 1) {
      tableRow.push((
        <tr>
          <td>{this.props.data.edit}</td>
          <td>{this.props.data.task_num}</td>
          <td>{this.props.data.sku}</td>
          <td>{this.props.data.profiles}</td>
          <td>{this.props.data.sizes}</td>
          <td>{this.props.data.num_pairs}</td>
          <td>{this.props.data.actions.run}</td>
          <td>{this.props.data.actions.stop}</td>
          <td>{this.props.data.actions.destroy}</td>
        </tr>
      ));
    }
    return tableRow;
  }

  render() {
    return (
      <div>{this.createTable}</div>
    );
  }
}

ViewTask.propTypes = {
  data: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default ViewTask;
