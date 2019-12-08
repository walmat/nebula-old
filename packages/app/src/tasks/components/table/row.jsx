import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { taskActions } from '../../../store/actions';

const TaskRowPrimitive = ({ style, index, task, onSelectTask }) => (
  <div
    onKeyPress={() => {}}
    role="button"
    tabIndex={-1}
    key={index}
    style={style}
    onClick={({ ctrlKey, shiftKey }) => onSelectTask(ctrlKey || shiftKey, task)}
    className="col col--expand col--no-gutter tasks-row-container"
  >
    <div
      key={task.id}
      className={
        task.selected
          ? 'tasks-row-selected row row--expand row--gutter'
          : 'tasks-row row row--expand row--gutter'
      }
    >
      <div
        className={
          task.type
            ? `col col--no-gutter tasks-row__product--${task.type}`
            : 'col col--no-gutter tasks-row__product'
        }
        title={task.product.raw}
      >
        {`${task.product.raw} ${task.product.variation ? `/ ${task.product.variation}` : ''}`}
      </div>
      <div className="col col--no-gutter tasks-row__store">
        {task.store ? task.store.name : 'None'}
      </div>
      <div className="col col--no-gutter tasks-row__profile">
        {task.profile ? task.profile.name : 'None'}
      </div>
      <div className="col col--no-gutter tasks-row__sizes">{task.size}</div>
      <div className="col col--no-gutter tasks-row__status">{task.message}</div>
    </div>
  </div>
);

TaskRowPrimitive.propTypes = {
  index: PropTypes.number.isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelectTask: PropTypes.func.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  index: ownProps.index,
  task: ownProps.task,
  style: ownProps.style,
});

export const mapDispatchToProps = dispatch => ({
  onSelectTask: (ctrl, task) => {
    dispatch(taskActions.select(ctrl, task));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskRowPrimitive);
