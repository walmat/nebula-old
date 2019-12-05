import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

import TaskRow from './taskRow';

import { makeTasks } from '../state/selectors';
import { taskActions } from '../../store/actions';

const Row = ({ data, index, style }) => {
  const task = data[index];
  return <TaskRow task={task} index={index} style={style} />;
};

Row.propTypes = {
  data: PropTypes.arrayOf(PropTypes.any).isRequired,
  index: PropTypes.number.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
};

const Table = ({ tasks }) => (
  <AutoSizer>
    {({ height, width }) => (
      <List height={height} width={width} itemSize={30} itemData={tasks} itemCount={tasks.length}>
        {Row}
      </List>
    )}
  </AutoSizer>
);

Table.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const ViewTaskPrimitive = ({ tasks }) => (
  <div className="row row--expand row--start">
    <div className="col col--expand col--start">
      <div className="row row--start row--expand">
        <div className="col col--expand col--start tasks-table-container">
          <div className="row row--start row--no-gutter tasks-table__header">
            <div className="col tasks-table__header__product">
              <p>Product / Variation</p>
            </div>
            <div className="col tasks-table__header__store">
              <p>Store</p>
            </div>
            <div className="col tasks-table__header__profile">
              <p>Profile</p>
            </div>
            <div className="col tasks-table__header__sizes">
              <p>Size</p>
            </div>
            <div className="col tasks-table__header__status">
              <p>Status</p>
            </div>
          </div>
          <div className="row row--start">
            <div className="col col--expand">
              <hr className="view-line" />
            </div>
          </div>
          <div className="row row--gutter row--expand row--start">
            <div className="col col--no-gutter tasks-table__wrapper">
              <div className="tasks-table">
                <Table tasks={tasks} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

ViewTaskPrimitive.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  tasks: makeTasks(state),
});

export const mapDispatchToProps = dispatch => ({
  onStartAllTasks: (tasks, delays, proxies) => {
    dispatch(taskActions.startAll(tasks, delays, proxies));
  },
  onStopAllTasks: tasks => {
    dispatch(taskActions.stopAll(tasks));
  },
  onRemoveAllTasks: tasks => {
    dispatch(taskActions.removeAll(tasks));
  },
  onMassEdit: (tasks, edits) => {
    dispatch(taskActions.editAll(tasks, edits));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ViewTaskPrimitive);
