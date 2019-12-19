import React from 'react';
import { connect } from 'react-redux';
import ModalImage from 'react-modal-image';
import PropTypes from 'prop-types';

import { taskActions } from '../../../store/actions';
import { statusColorMap } from '../../../constants';

const TaskRowPrimitive = ({ style, index, task, onSelectTask }) => {
  const match = /Starting at|No variation|No size|Waiting for restock|Waiting for captcha|Duplicate order|Checking status|Checkout failed|Polling queue|Payment successful|Payment failed/i.exec(
    task.message,
  );
  const messageClassName = match ? statusColorMap[match[0]] : 'normal';
  return (
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
          title={task.productName || task.product.raw}
        >
          {task.productImage ? (
            <ModalImage
              className="col col--no-gutter tasks-row__product--image"
              small={task.productImage}
              large={task.productImageHi}
              hideDownload
              hideZoom
              alt=""
            />
          ) : null}
          <p
            className={
              task.productImage
                ? 'col col--no-gutter tasks-row__product--clearfix'
                : 'col col--no-gutter'
            }
          >
            {task.productName
              ? task.productName
              : task.product.variation ? `${task.product.raw} / ${task.product.variation}` : task.product.raw}
          </p>
        </div>
        <div className="col col--no-gutter tasks-row__store">
          {task.store ? task.store.name : 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__profile">
          {task.profile ? task.profile.name : 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__sizes">{task.chosenSize || task.size}</div>
        <div className="col col--no-gutter tasks-row__proxy">{task.chosenProxy || 'None'}</div>
        <div className={`col col--no-gutter tasks-row__status--${messageClassName}`}>
          {task.message}
        </div>
      </div>
    </div>
  );
};

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

export default connect(mapStateToProps, mapDispatchToProps)(TaskRowPrimitive);
