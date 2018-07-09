import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const tableRow = [];

    // TODO – define height/widths for each table data entry

    for (let i = 0; i < this.props.data.length; i += 1) {
      tableRow.push((
        <tr>
          <td id={`${this.props.data.id}-edit`}>{this.props.data.edit}</td>
          <td id={`${this.props.data.id}-id`}>{this.props.data.id}</td>
          <td id={`${this.props.data.id}-sku`}>{this.props.data.sku}</td>
          <td id={`${this.props.data.id}-profile`}>{this.props.data.profile}</td>
          <td id={`${this.props.data.id}-sizes`}>{this.props.data.sizes}</td>
          <td id={`${this.props.data.id}-pairs`}>{this.props.data.pairs}</td>
          <td id={`${this.props.data.id}-run`}>{this.props.data.actions.run}</td>
          <td id={`${this.props.data.id}-stop`}>{this.props.data.actions.stop}</td>
          <td id={`${this.props.data.id}-destroy`}>{this.props.data.actions.destroy}</td>
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
