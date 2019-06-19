import React, { PureComponent } from 'react';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { connect } from 'react-redux';
import TaskRow from './taskRow';
import defns from '../utils/definitions/taskDefinitions';

export class ViewTaskPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.renderRow = this.renderRow.bind(this);

    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 31,
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps !== this.props) {
      // clear the cache (maybe we can just do .clear() on the changed index somehow?)
      this.cache.clearAll();
      // recalculate the row that changed (pass index in as param when we figure that out)
      this.tasks.recomputeRowHeights();

      // lastly, force an update to the entire grid to shift it
      this.tasks.forceUpdateGrid();
    }
  }

  createTable() {
    const { tasks } = this.props;
    return (
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={r => {
              this.tasks = r;
            }}
            width={width}
            height={height}
            deferredMeasurementCache={this.cache}
            rowHeight={this.cache.rowHeight}
            rowRenderer={this.renderRow}
            rowCount={tasks.length}
            overscanRowsCount={10}
          />
        )}
      </AutoSizer>
    );
  }

  renderRow({ index, key, style, parent }) {
    const { tasks } = this.props;
    return (
      <CellMeasurer key={key} cache={this.cache} parent={parent} columnIndex={0} rowIndex={index}>
        <TaskRow task={tasks[index]} style={style} />
      </CellMeasurer>
    );
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

export default connect(mapStateToProps)(ViewTaskPrimitive);
