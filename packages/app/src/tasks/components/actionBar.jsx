import React, { Component } from 'react';
import { connect } from 'react-redux';
// import { parseURL } from 'whatwg-url';
import PropTypes from 'prop-types';

import Delays from './delays';
import { appActions } from '../../app/state/actions';
import { taskActions } from '../state/actions';
import { makeTasks, makeSelectedTasks } from '../state/selectors';
import { makeDelays, makeProxies } from '../../settings/state/selectors';

// const _handleKeyPress = async e => {
//   const { keyCode } = e;

//   if (window.Bridge) {
//     switch (keyCode) {
//       case 114: {
//         // START ALL
//         this.startAllTasks();
//         break;
//       }
//       case 115: {
//         // STOP ALL
//         this.stopAllTasks();
//         break;
//       }
//       case 116: {
//         // MASS OVERRIDE LINK
//         /**
//          * 1. Get clipboard data
//          * 2. Check if it's a valid link
//          * 3. Change all tasks with the same site url to the new product data (edit task to show it as well)
//          * 4. Start all newly changed tasks
//          */
//         const url = await navigator.clipboard.readText();
//         const URL = parseURL(url);

//         if (!URL || !URL.host || (URL.path && !URL.path[0])) {
//           break;
//         }

//         const { tasks, onMassEdit } = this.props;

//         const tasksToChange = tasks.filter(
//           t => t.site.url.indexOf(URL.host) > -1 && t.status === 'running',
//         );

//         onMassEdit(tasksToChange, { url });
//         break;
//       }
//       case 117: {
//         // MASS OVERRIDE PW
//         /** TODO:
//          * 1. Get clipboard data
//          * 2. Send window.Bridge event with data
//          * 3. on task-runner side, check to see which tasks are needing a password somehow
//          */
//         const password = await navigator.clipboard.readText();

//         if (!password) {
//           break;
//         }
//         const { tasks, onMassEdit } = this.props;
//         onMassEdit(tasks, { password });
//         break;
//       }
//       default:
//         break;
//     }
//   }
// };

// const handleClickRow = (event, { rowIndex }) => {
//   const { selection } = this.state;

//   if (event.ctrlKey) {
//     if (!selection.includes(rowIndex)) {
//       this.setState({ selection: [...selection, rowIndex] });
//     } else {
//       const newSelection = selection.filter(i => i !== rowIndex);
//       this.setState({ selection: [...newSelection] });
//     }
//   } else if (event.shiftKey && selection.length) {
//     selection.push(rowIndex);
//     this.setState({ selection: rangeArr(min(selection), max(selection)) });
//   } else {
//     this.setState({ selection: [rowIndex] });
//   }
// };

class ActionBar extends Component {
  constructor(props) {
    super(props);

    this._handleKeyPress = this._handleKeyPress.bind(this);
  }

  componentDidMount() {
    window.addEventListener('keypress', this._handleKeyPress);
  }

  componentWillUnmount() {
    window.removeEventListener('keypress', this._handleKeyPress);
  }

  async _handleKeyPress(e) {
    const { keyCode } = e;

    if (window.Bridge) {
      switch (keyCode) {
        case 114: {
          const { start, tasks } = this.props;
          return start(tasks);
        }
        case 115: {
          const { stop, tasks } = this.props;
          return stop(tasks);
        }
        case 116: {
          // const url = await navigator.clipboard.readText();
          // const URL = parseURL(url);

          // if (!URL || !URL.host || (URL.path && !URL.path[0])) {
          //   break;
          // }

          // const { tasks, onMassEdit } = this.props;

          // const tasksToChange = tasks.filter(
          //   t => t.site.url.indexOf(URL.host) > -1 && t.status === 'running',
          // );

          // onMassEdit(tasksToChange, { url });
          break;
        }
        case 117: {
          // MASS OVERRIDE PW
          /** TODO:
           * 1. Get clipboard data
           * 2. Send window.Bridge event with data
           * 3. on task-runner side, check to see which tasks are needing a password somehow
           */
          // const password = await navigator.clipboard.readText();

          // if (!password) {
          //   break;
          // }
          // const { tasks, onMassEdit } = this.props;
          // onMassEdit(tasks, { password });
          break;
        }
        default:
          break;
      }
    }
    return null;
  }

  render() {
    const { toggleCreate, tasks, delays, proxies, start, stop, remove } = this.props;
    return (
      <div className="row" style={{ marginTop: 15 }}>
        <div className="row row--gutter" style={{ justifyContent: 'center' }}>
          <div className="col col--end">
            <button
              className="bulk-action__button--secondary"
              type="button"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={toggleCreate}
            >
              Create
            </button>
          </div>
          <div className="col col--end">
            <button
              className="bulk-action__button--primary"
              type="button"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={() => start(tasks, delays, proxies)}
            >
              Start
            </button>
          </div>
          <div className="col col--end">
            <button
              className="bulk-action__button--warning"
              type="button"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={() => stop(tasks)}
            >
              Stop
            </button>
          </div>
          <div className="col col--end">
            <button
              className="bulk-action__button--error"
              type="button"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={() => remove(tasks)}
            >
              Remove
            </button>
          </div>
          <Delays />
        </div>
      </div>
    );
  }
}

ActionBar.propTypes = {
  toggleCreate: PropTypes.func.isRequired,
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  delays: PropTypes.arrayOf(PropTypes.any).isRequired,
  proxies: PropTypes.arrayOf(PropTypes.string).isRequired,
  start: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  toggleCreate: state.App.toggleCreate,
  tasks: makeTasks(state),
  // tasks: makeSelectedTasks(state),
  delays: makeDelays(state),
  proxies: makeProxies(state),
});

const mapDispatchToProps = dispatch => ({
  toggleCreate: () => dispatch(appActions.toggleCreate()),
  start: (tasks, delays, proxies) => dispatch(taskActions.start(tasks, delays, proxies)),
  stop: tasks => dispatch(taskActions.stop(tasks)),
  remove: tasks => dispatch(taskActions.remove(tasks)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ActionBar);
