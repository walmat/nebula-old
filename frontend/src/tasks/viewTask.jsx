import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

class ViewTask extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
  }

  createTable() {
    const table = [];
    for (let i = 0; i < this.props.tasks.length; i += 1) {
      table.push((
        <tr>
          <td id={`${this.props.tasks[i].id}-edit`}>{this.props.tasks[i].edit}</td>
          <td id={`${this.props.tasks[i].id}-id`}>{this.props.tasks[i].id}</td>
          <td id={`${this.props.tasks[i].id}-sku`}>{this.props.tasks[i].sku}</td>
          <td id={`${this.props.tasks[i].id}-profile`}>{this.props.tasks[i].profile}</td>
          <td id={`${this.props.tasks[i].id}-sizes`}>{this.props.tasks[i].sizes}</td>
          <td id={`${this.props.tasks[i].id}-pairs`}>{this.props.tasks[i].pairs}</td>
          <td id={`${this.props.tasks[i].id}-run`}>{this.props.tasks[i].actions.run}</td>
          <td id={`${this.props.tasks[i].id}-stop`}>{this.props.tasks[i].actions.stop}</td>
          <td id={`${this.props.tasks[i].id}-destroy`}>{this.props.tasks[i].actions.destroy}</td>
        </tr>
      ));
    }
    return table;
  }

  render() {
    return (
      <table>{this.createTable}</table>
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
