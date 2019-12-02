import React, { PureComponent } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { parseURL } from 'whatwg-url';
import { getAllSizesStripped } from '../../constants/getAllSizes';
import {
  DropdownIndicator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';
import { addTestId, renderSvgIcon } from '../../utils';
import { ReactComponent as EditIcon } from '../../styles/images/tasks/edit.svg';
import { ReactComponent as CopyIcon } from '../../styles/images/tasks/copy.svg';
import { ReactComponent as StartIcon } from '../../styles/images/tasks/start.svg';
import { ReactComponent as StopIcon } from '../../styles/images/tasks/stop.svg';
import { ReactComponent as DestroyIcon } from '../../styles/images/tasks/destroy.svg';
import { taskActions, mapTaskFieldsToKey, TASK_FIELDS } from '../../store/actions';
import { buildStyle } from '../../styles';

export class TaskRowPrimitive extends PureComponent {
  static createSite(value) {
    const URL = parseURL(value);
    if (!URL || !URL.host) {
      return null;
    }
    return { name: URL.host, url: `${URL.scheme}://${URL.host}` };
  }

  static createSize(value) {
    if (!value) {
      return null;
    }
    return value;
  }

  constructor(props) {
    super(props);

    this.handleCreate = this.handleCreate.bind(this);
    this.createOnChangeHandler = this.createOnChangeHandler.bind(this);
    this.buildProfileOptions = this.buildProfileOptions.bind(this);
    this.saveTask = this.saveTask.bind(this);
    this.selectTask = this.selectTask.bind(this);
    this.renderTableRowButton = this.renderTableRowButton.bind(this);
    this.renderTableRowActionButton = this.renderTableRowActionButton.bind(this);
    this.renderTableRowCopyActionButton = this.renderTableRowCopyActionButton.bind(this);
    this.renderTableRowStartStopActionButton = this.renderTableRowStartStopActionButton.bind(this);
    this.renderTableRowDestroyActionButton = this.renderTableRowDestroyActionButton.bind(this);
    this.renderTableRow = this.renderTableRow.bind(this);

    this.state = {
      isLoadingSite: false,
      isLoadingSize: false,
    };
  }

  createOnChangeHandler(field, event) {
    const { onEditTask, task, sites } = this.props;
    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        const site = {
          name: event.label,
          url: event.value,
          apiKey: event.apiKey,
          localCheckout: event.localCheckout || false,
          special: event.special || false,
          auth: event.auth,
        };
        return onEditTask(task, { field, value: site });
      }
      case TASK_FIELDS.EDIT_PROFILE: {
        const { profiles } = this.props;
        const value = profiles.find(p => p.id === event.value);
        if (value) {
          return onEditTask(task, { field, value });
        }
        return null;
      }
      case TASK_FIELDS.EDIT_SIZES: {
        return onEditTask(task, { field, value: event.value });
      }
      case TASK_FIELDS.EDIT_PRODUCT:
        return onEditTask(task, { field, value: event.target.value, sites });
      default: {
        return onEditTask(task, { field, value: event.target.value });
      }
    }
  }

  handleCreate(value, field) {
    const { onEditTask, task } = this.props;

    switch (field) {
      case TASK_FIELDS.EDIT_SITE: {
        this.setState({ isLoadingSite: true });
        setTimeout(() => {
          const newOption = TaskRowPrimitive.createSite(value);
          if (newOption) {
            onEditTask(task, { field, value: newOption });
          }
          this.setState({
            isLoadingSite: false,
          });
        }, 150);
        break;
      }
      case TASK_FIELDS.EDIT_SIZES: {
        this.setState({ isLoadingSize: true });
        setTimeout(() => {
          const newSize = TaskRowPrimitive.createSize(value);
          if (newSize) {
            onEditTask(task, { field, value: newSize });
          }
          this.setState({
            isLoadingSize: false,
          });
        }, 150);
        break;
      }
      default:
        break;
    }
  }

  saveTask() {
    const { task, onCommitEdits } = this.props;
    onCommitEdits(task);
  }

  cancelEdits() {
    const { task, onCancelEdits } = this.props;
    onCancelEdits(task);
  }

  selectTask() {
    const { onSelectTask, task } = this.props;
    // if (!) {
    //   onSelectTask(task);
    // } else {
    //   // deselect current task (or toggle it)
    //   onSelectTask(null);
    // }
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    return profiles.map(profile => ({ value: profile.id, label: profile.profileName }));
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
    return this.renderTableRowActionButton('copy', 'Copy Task', CopyIcon, '', () => {
      onCopyTask(task);
    });
  }

  renderTableRowStartStopActionButton() {
    const { task, onStartTask, onStopTask, proxies } = this.props;

    if (task.status === 'running') {
      return this.renderTableRowActionButton(
        'stop',
        'Stop Task',
        StopIcon,
        task.status === 'stopped' ? 'active' : '',
        () => {
          onStopTask(task);
        },
      );
    }
    return this.renderTableRowActionButton(
      'start',
      'Start Task',
      StartIcon,
      task.status === 'running' ? 'active' : '',
      () => {
        onStartTask(task, proxies);
      },
    );
  }

  renderTableRowDestroyActionButton() {
    const { task, onDestroyTask } = this.props;
    return this.renderTableRowActionButton('destroy', 'Destroy Task', DestroyIcon, '', () => {
      onDestroyTask(task);
    });
  }

  renderTableRow() {
    const { task, index, theme } = this.props;
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
        <div className="col col--no-gutter tasks-row__sites">{task.site.name}</div>
        <div className="col col--no-gutter tasks-row__profile">{task.profile.name}</div>
        <div className="col col--no-gutter tasks-row__sizes">{task.size}</div>
        <div className="col col--no-gutter tasks-row__account">
          {task.account ? task.account.name : 'None'}
        </div>
        <div className="col col--no-gutter tasks-row__actions">
          <div className="row row--expand row--evenly row--gutter">
            {this.renderTableRowCopyActionButton()}
            {this.renderTableRowStartStopActionButton()}
            {this.renderTableRowDestroyActionButton()}
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
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  index: PropTypes.number.isRequired,
  task: PropTypes.objectOf(PropTypes.any).isRequired,
  onSelectTask: PropTypes.func.isRequired,
  onCopyTask: PropTypes.func.isRequired,
  onStartTask: PropTypes.func.isRequired,
  onStopTask: PropTypes.func.isRequired,
  onDestroyTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onCommitEdits: PropTypes.func.isRequired,
  onCancelEdits: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
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
  sites: (state.Sites || []).filter(site => site.label === ownProps.task.platform),
  style: ownProps.style,
  theme: state.App.theme,
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
  onDestroyTask: task => {
    dispatch(taskActions.remove(task, 'one'));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TaskRowPrimitive);
