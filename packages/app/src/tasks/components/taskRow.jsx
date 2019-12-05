import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
// import { addTestId, renderSvgIcon } from '../../utils';
// import { ReactComponent as DuplicateIcon } from '../../styles/images/tasks/copy.svg';
// import { ReactComponent as StartIcon } from '../../styles/images/tasks/start.svg';
// import { ReactComponent as StopIcon } from '../../styles/images/tasks/stop.svg';
// import { ReactComponent as RemoveIcon } from '../../styles/images/tasks/destroy.svg';

// import { States } from '../../constants/tasks';

const TaskRowPrimitive = ({ style, index, task, onSelectTask }) => (
  <div
    onKeyPress={() => {}}
    role="button"
    tabIndex={-1}
    key={index}
    style={style}
    onClick={onSelectTask}
    className="col col--expand col--no-gutter tasks-row-container"
  >
    <div key={task.id} className="tasks-row row row--expand row--gutter">
      <div className="col col--no-gutter tasks-row__product" title={task.product.raw}>
        {`${task.product.raw} ${task.product.variation ? `/ ${task.product.variation}` : ''}`}
      </div>
      <div className="col col--no-gutter tasks-row__store">{task.store.name}</div>
      <div className="col col--no-gutter tasks-row__profile">{task.profile.name}</div>
      <div className="col col--no-gutter tasks-row__sizes">{task.size}</div>
      <div className="col col--no-gutter tasks-row__status">{task.message}</div>
    </div>
  </div>
);

TaskRowPrimitive.propTypes = {
  index: PropTypes.number.isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelectTask: PropTypes.func.isRequired,
  // onDuplicateTask: PropTypes.func.isRequired,
  // onStartTask: PropTypes.func.isRequired,
  // onStopTask: PropTypes.func.isRequired,
  // onRemoveTask: PropTypes.func.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  // proxies: makeProxies(state),
  index: ownProps.index,
  task: ownProps.task,
  style: ownProps.style,
});

export const mapDispatchToProps = dispatch => ({
  // onSelectTask: task => {
  //   dispatch(taskActions.select(task));
  // },
  // onDuplicateTask: task => {
  //   dispatch(taskActions.duplicate(task));
  // },
  // onStartTask: (task, delays, proxies) => {
  //   dispatch(taskActions.start(task, delays, proxies));
  // },
  // onStopTask: task => {
  //   dispatch(taskActions.stop(task));
  // },
  // onRemoveTask: id => {
  //   dispatch(taskActions.remove(id));
  // },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskRowPrimitive);
