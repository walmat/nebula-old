import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addTestId, renderSvgIcon } from '../../utils';
import { ReactComponent as CopyIcon } from '../../styles/images/tasks/copy.svg';
import { ReactComponent as StartIcon } from '../../styles/images/tasks/start.svg';
import { ReactComponent as StopIcon } from '../../styles/images/tasks/stop.svg';
import { ReactComponent as RemoveIcon } from '../../styles/images/tasks/destroy.svg';
import { taskActions } from '../../store/actions';

export class TaskRowPrimitive extends PureComponent {
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
    const { task, onCopyTask } = this.props;
    return this.renderTableRowActionButton('copy', 'Copy Task', CopyIcon, '', () =>
      onCopyTask(task),
    );
  }

  renderTableRowStartStopActionButton() {
    const { task, onStartTask, onStopTask, proxies } = this.props;

    if (task.status === 'running') {
      return this.renderTableRowActionButton(
        'stop',
        'Stop Task',
        StopIcon,
        task.status === 'stopped' ? 'active' : '',
        () => onStopTask(task),
      );
    }
    return this.renderTableRowActionButton(
      'start',
      'Start Task',
      StartIcon,
      task.status === 'running' ? 'active' : '',
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
  onCopyTask: PropTypes.func.isRequired,
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
  profiles: state.Profiles,
  proxies: state.Proxies,
  index: ownProps.index,
  task: ownProps.task,
  style: ownProps.style,
});

export const mapDispatchToProps = dispatch => ({
  onSelectTask: task => {
    dispatch(taskActions.select(task));
  },
  onCopyTask: task => {
    dispatch(taskActions.duplicate(task));
  },
  onStartTask: (task, proxies) => {
    dispatch(taskActions.start(task, proxies));
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
