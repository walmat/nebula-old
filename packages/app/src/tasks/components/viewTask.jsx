import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { parseURL } from 'whatwg-url';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import NumberFormat from 'react-number-format';

import Delays from './delays';
import TaskRow from './taskRow';

import { makeProxies, makeDelays } from '../../settings/state/selectors';
import { makeTasks } from '../state/selectors';
import { taskActions } from '../../store/actions';
import { max, min, rangeArr } from '../../utils';
import { buildStyle } from '../../styles';
import { States } from '../../constants/tasks';

export class ViewTaskPrimitive extends PureComponent {
  static renderRow({ data, index, style }) {
    const task = data[index];

    return <TaskRow task={task} index={index} style={style} />;
  }

  constructor(props) {
    super(props);

    this.createTable = this.createTable.bind(this);
    this.startAllTasks = this.startAllTasks.bind(this);
    this.stopAllTasks = this.stopAllTasks.bind(this);
    this.removeAllTasks = this.removeAllTasks.bind(this);
    this.renderDelay = this.renderDelay.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  componentDidMount() {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this._handleKeyDown);
  }

  startAllTasks() {
    const { tasks, delays, proxies, onStartAllTasks } = this.props;
    if (tasks.length && tasks.some(t => t.state !== States.Running)) {
      onStartAllTasks(tasks, delays, proxies);
    }
  }

  stopAllTasks() {
    const { tasks, onStopAllTasks } = this.props;
    if (tasks.length && tasks.some(t => t.state === States.Running)) {
      onStopAllTasks(tasks);
    }
  }

  removeAllTasks() {
    const { tasks, onRemoveAllTasks } = this.props;
    if (tasks.length) {
      onRemoveAllTasks(tasks);
    }
  }

  handleClickRow(event, { rowIndex }) {
    const { selection } = this.state;

    if (event.ctrlKey) {
      if (!selection.includes(rowIndex)) {
        this.setState({ selection: [...selection, rowIndex] });
      } else {
        const newSelection = selection.filter(i => i !== rowIndex);
        this.setState({ selection: [...newSelection] });
      }
    } else if (event.shiftKey && selection.length) {
      selection.push(rowIndex);
      this.setState({ selection: rangeArr(min(selection), max(selection)) });
    } else {
      this.setState({ selection: [rowIndex] });
    }
  }

  async _handleKeyDown(e) {
    const { keyCode } = e;

    if (window.Bridge) {
      switch (keyCode) {
        case 114: {
          // START ALL
          this.startAllTasks();
          break;
        }
        case 115: {
          // STOP ALL
          this.stopAllTasks();
          break;
        }
        case 116: {
          // MASS OVERRIDE LINK
          /**
           * 1. Get clipboard data
           * 2. Check if it's a valid link
           * 3. Change all tasks with the same site url to the new product data (edit task to show it as well)
           * 4. Start all newly changed tasks
           */
          const url = await navigator.clipboard.readText();
          const URL = parseURL(url);

          if (!URL || !URL.host || (URL.path && !URL.path[0])) {
            break;
          }

          const { tasks, onMassEdit } = this.props;

          const tasksToChange = tasks.filter(
            t => t.site.url.indexOf(URL.host) > -1 && t.status === 'running',
          );

          onMassEdit(tasksToChange, { url });
          break;
        }
        case 117: {
          // MASS OVERRIDE PW
          /** TODO:
           * 1. Get clipboard data
           * 2. Send window.Bridge event with data
           * 3. on task-runner side, check to see which tasks are needing a password somehow
           */
          const password = await navigator.clipboard.readText();

          if (!password) {
            break;
          }
          const { tasks, onMassEdit } = this.props;
          onMassEdit(tasks, { password });
          break;
        }
        default:
          break;
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  toggleSelected(task) {
    // todo...
  }

  createTable() {
    const { tasks } = this.props;

    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemSize={30}
            itemData={tasks}
            itemCount={tasks.length}
          >
            {ViewTaskPrimitive.renderRow}
          </List>
        )}
      </AutoSizer>
    );
  }

  _setListRef(ref) {
    this._list = ref;
    this._registerList(ref);
  }

  renderDelay(field, value) {
    const { className, delayType, label, placeholder } = this.delays[field];
    return (
      <div className={className}>
        <p className="tasks__label">{label}</p>
        <NumberFormat
          value={value}
          placeholder={placeholder}
          className={`bulk-action-sidebar__${delayType}-delay`}
          style={buildStyle(false)}
          onChange={e => this.createOnChangeHandler(field, e)}
          required
        />
      </div>
    );
  }

  render() {
    return (
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
                  <div className="tasks-table">{this.createTable()}</div>
                </div>
              </div>
            </div>
            {/* <div className="col col--start bulk-action-sidebar">

              <Delays />
            </div> */}
          </div>
        </div>
      </div>
    );
  }
}

ViewTaskPrimitive.propTypes = {
  delays: PropTypes.objectOf(PropTypes.any).isRequired,
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  proxies: PropTypes.arrayOf(PropTypes.any).isRequired,
  // funcs...
  onStartAllTasks: PropTypes.func.isRequired,
  onStopAllTasks: PropTypes.func.isRequired,
  onRemoveAllTasks: PropTypes.func.isRequired,
  onMassEdit: PropTypes.func.isRequired,
};

ViewTaskPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  delays: makeDelays(state),
  tasks: makeTasks(state),
  proxies: makeProxies(state),
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
