import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

import TableHeader from './header';
import TableRow from './row';

import { makeTasks } from '../../state/selectors';

const Row = ({ data, index, style }) => {
  const task = data[index];
  return <TableRow task={task} index={index} style={style} />;
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

const TaskTablePrimitive = ({ tasks }) => (
  <div className="row row--expand row--start">
    <div className="col col--expand col--start">
      <div className="row row--start row--expand">
        <div className="col col--expand col--start tasks-table-container">
          <TableHeader />
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

TaskTablePrimitive.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  tasks: makeTasks(state),
});

export const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskTablePrimitive);
