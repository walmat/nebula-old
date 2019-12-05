import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addTestId, renderSvgIcon } from '../../utils';
import { ReactComponent as DuplicateIcon } from '../../styles/images/tasks/copy.svg';
import { ReactComponent as StartIcon } from '../../styles/images/tasks/start.svg';
import { ReactComponent as StopIcon } from '../../styles/images/tasks/stop.svg';
import { ReactComponent as RemoveIcon } from '../../styles/images/tasks/destroy.svg';

import { States } from '../../constants/tasks';

import { makeProxies } from '../../settings/state/selectors';
import { taskActions } from '../../store/actions';

export class TaskRowPrimitive extends Component {
  constructor(props) {
    super(props);

    this.renderTableRowButton = this.renderTableRowButton.bind(this);
    this.renderTableRowActionButton = this.renderTableRowActionButton.bind(this);
    this.renderTableRowCopyActionButton = this.renderTableRowCopyActionButton.bind(this);
    this.renderTableRowStartStopActionButton = this.renderTableRowStartStopActionButton.bind(this);
    this.renderTableRowRemoveActionButton = this.renderTableRowRemoveActionButton.bind(this);
    this.renderTableRow = this.renderTableRow.bind(this);
  }

  renderTableRowButton(tag, desc, src, className, onClick) {
    const { onKeyPress } = this.props;
    return (
      <div
        role="button"
        tabIndex={0}
        title={desc}
        onKeyPress={onKeyPress}
        onClick={onClick}
        data-testid={addTestId(`TaskRow.button.${tag}`)}
      >
        {renderSvgIcon(src, { alt: desc, className })}
      </div>
    );
  }

  renderTableRowActionButton(tag, desc, src, className, onClick) {
    return (
      <div className="col col--no-gutter col--center tasks-row__actions__button">
        {this.renderTableRowButton(`action.${tag}`, desc, src, className, onClick)}
      </div>
    );
  }

  renderTableRowCopyActionButton() {
    const { task, onDuplicateTask } = this.props;
    return this.renderTableRowActionButton('duplicate', 'Duplicate', DuplicateIcon, '', () =>
      onDuplicateTask(task),
    );
  }

  renderTableRowStartStopActionButton() {
    const { task, onStartTask, onStopTask, proxies } = this.props;

    if (task.state === States.Running) {
      return this.renderTableRowActionButton(
        'stop',
        'Stop',
        StopIcon,
        task.state === States.Stopped ? 'active' : '',
        () => onStopTask(task),
      );
    }
    return this.renderTableRowActionButton(
      'start',
      'Start',
      StartIcon,
      task.state === States.Running ? 'active' : '',
      () => onStartTask(task, proxies),
    );
  }

  renderTableRowRemoveActionButton() {
    const { task, onRemoveTask } = this.props;
    return this.renderTableRowActionButton('remove', 'Remove Task', RemoveIcon, '', () =>
      onRemoveTask(task),
    );
  }

  renderTableRow() {
    const { task, index } = this.props;
    return (
      <div key={task.id} className="tasks-row row row--expand row--gutter">
        <div
          className={
            task.type
              ? `col col--no-gutter tasks-row__id--${task.type}`
              : 'col col--no-gutter tasks-row__id'
          }
        >
          {index}
        </div>
        <div className="col col--no-gutter tasks-row__product" title={task.product.raw}>
          {`${task.product.raw} ${task.product.variation ? `/ ${task.product.variation}` : ''}`}
        </div>
        <div className="col col--no-gutter tasks-row__store">{task.store.name}</div>
        <div className="col col--no-gutter tasks-row__profile">{task.profile.name}</div>
        <div className="col col--no-gutter tasks-row__sizes">{task.size}</div>
        <div className="col col--no-gutter tasks-row__account">
          {task.account ? task.account.name : 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__actions">
          <div className="row row--expand row--evenly row--gutter">
            {this.renderTableRowCopyActionButton()}
            {this.renderTableRowStartStopActionButton()}
            {this.renderTableRowRemoveActionButton()}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { style } = this.props;
    return (
      <div style={style} className="col col--expand col--no-gutter tasks-row-container">
        {this.renderTableRow()}
      </div>
    );
  }
}

TaskRowPrimitive.propTypes = {
  proxies: PropTypes.arrayOf(PropTypes.any).isRequired,
  index: PropTypes.number.isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
  onDuplicateTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
};

TaskRowPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  proxies: makeProxies(state),
  index: ownProps.index,
  task: ownProps.task,
  style: ownProps.style,
});

export const mapDispatchToProps = dispatch => ({
  onSelectTask: task => {
    dispatch(taskActions.select(task));
  },
  onDuplicateTask: task => {
    dispatch(taskActions.duplicate(task));
  },
  onStartTask: (task, delays, proxies) => {
    dispatch(taskActions.start(task, delays, proxies));
  },
  onStopTask: task => {
    dispatch(taskActions.stop(task));
  },
  onRemoveTask: id => {
    dispatch(taskActions.remove(id));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskRowPrimitive);
