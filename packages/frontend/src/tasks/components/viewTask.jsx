import React, { PureComponent } from 'react';
import {
  InfiniteLoader,
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from 'react-virtualized';
import { connect } from 'react-redux';
import TaskRow from './taskRow';
import defns from '../../state/definitions/taskDefinitions';

export class ViewTaskPrimitive extends PureComponent {
  constructor(props) {
    super(props);
    this.createTable = this.createTable.bind(this);
    this.renderRow = this.renderRow.bind(this);
    this.isRowLoaded = this.isRowLoaded.bind(this);
    this.loadMoreRows = this.loadMoreRows.bind(this);
    this._setListRef = this._setListRef.bind(this);

    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 30,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      selectedTask: { id },
    } = this.props;

    if (id !== prevProps.selectedTask.id) {
      this.cache.clearAll();
      if (this._list) {
        this._list.recomputeRowHeights();
      }
    }
  }

  isRowLoaded({ index }) {
    const { tasks } = this.props;
    return !!tasks[index];
  }

  loadMoreRows({ start, stop }) {
    const { tasks } = this.props;
    return tasks.slice(start, stop);
  }

  createTable() {
    const { tasks } = this.props;
    return (
      <InfiniteLoader
        isRowLoaded={this.isRowLoaded}
        loadMoreRows={this.loadMoreRows}
        rowCount={tasks.length}
      >
        {({ onRowsRendered, registerChild }) => {
          this._registerList = registerChild;

          return (
            <AutoSizer>
              {({ width, height }) => (
                <List
                  tasks={tasks}
                  width={width}
                  height={height}
                  onRowsRendered={onRowsRendered}
                  ref={this._setListRef}
                  deferredMeasurementCache={this.cache}
                  rowHeight={this.cache.rowHeight}
                  rowRenderer={this.renderRow}
                  rowCount={tasks.length}
                  overscanRowCount={50}
                />
              )}
            </AutoSizer>
          );
        }}
      </InfiniteLoader>
    );
  }

  _setListRef(ref) {
    this._list = ref;
    this._registerList(ref);
  }

  renderRow({ index, key, style, parent }) {
    const { tasks } = this.props;
    return (
      <CellMeasurer
        key={key}
        style={style}
        cache={this.cache}
        parent={parent}
        columnIndex={0}
        rowIndex={index}
      >
        <TaskRow key={key} task={tasks[index]} style={style} />
      </CellMeasurer>
    );
  }

  render() {
    return <div className="tasks-table">{this.createTable()}</div>;
  }
}

ViewTaskPrimitive.propTypes = {
  tasks: defns.taskList.isRequired,
  selectedTask: defns.task.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks,
  selectedTask: state.selectedTask,
});

export default connect(mapStateToProps)(ViewTaskPrimitive);
