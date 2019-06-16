/* eslint-disable no-return-assign */
import React, { Component, memo } from 'react';
import { List, AutoSizer } from 'react-virtualized';
import { connect } from 'react-redux';
import TaskRow from './taskRow';
import defns from '../utils/definitions/taskDefinitions';

export class ViewTaskPrimitive extends Component {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.renderRow = this.renderRow.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps !== this.props) {
      this.tasks.forceUpdateGrid();
    }
  }

  createTable() {
    const { tasks } = this.props;
    return (
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={r => (this.tasks = r)}
            width={width}
            height={height}
            rowHeight={30}
            rowRenderer={this.renderRow}
            rowCount={tasks.length}
            overscanRowsCount={10}
          />
        )}
      </AutoSizer>
    );
  }

  renderRow({ index, key, style }) {
    const { tasks } = this.props;
    return <TaskRow key={key} task={tasks[index]} style={style} />;
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

export default memo(connect(mapStateToProps)(ViewTaskPrimitive));
