import React, { Component } from 'react';
import { connect } from 'react-redux';
// import { parseURL } from 'whatwg-url';
import PropTypes from 'prop-types';

import Delays from '../delays';
import { appActions } from '../../../app/state/actions';
import { taskActions } from '../../state/actions';
import { makeSelectedTasks } from '../../state/selectors';
import { makeDelays, makeProxies } from '../../../settings/state/selectors';

class ActionBar extends Component {
  constructor(props) {
    super(props);

    this._handleKeyPress = this._handleKeyPress.bind(this);
  }

  componentDidMount() {
    window.addEventListener('keydown', this._handleKeyPress);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this._handleKeyPress);
  }

  async _handleKeyPress({ keyCode, shiftKey }) {
    if (window.Bridge) {
      switch (keyCode) {
        case 65: {
          if (!shiftKey) {
            break;
          }
          const { select, tasks } = this.props;
          return select(tasks);
        }
        case 114: {
          const { start, tasks } = this.props;
          if (!tasks.length) {
            return null;
          }
          return start(tasks);
        }
        case 115: {
          const { stop, tasks } = this.props;
          if (!tasks.length) {
            return null;
          }
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

  _start() {
    const { tasks, delays, proxies, start } = this.props;

    if (tasks.length) {
      return start(tasks, delays, proxies);
    }
    return null;
  }

  _stop() {
    const { tasks, stop } = this.props;

    if (tasks.length) {
      return stop(tasks);
    }
    return null;
  }

  _remove() {
    const { tasks, remove } = this.props;

    if (tasks.length) {
      return remove(tasks);
    }
    return null;
  }

  render() {
    const { toggleCreate, tasks, delays, proxies } = this.props;
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
              onClick={() => this._start(tasks, delays, proxies)}
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
              onClick={() => this._stop(tasks)}
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
              onClick={() => this._remove(tasks)}
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
  delays: PropTypes.objectOf(PropTypes.any).isRequired,
  proxies: PropTypes.arrayOf(PropTypes.string).isRequired,
  select: PropTypes.func.isRequired,
  start: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  toggleCreate: state.App.toggleCreate,
  tasks: makeSelectedTasks(state),
  delays: makeDelays(state),
  proxies: makeProxies(state),
});

const mapDispatchToProps = dispatch => ({
  toggleCreate: () => dispatch(appActions.toggleCreate()),
  select: tasks => dispatch(taskActions.selectAll(tasks)),
  start: (tasks, delays, proxies) => dispatch(taskActions.start(tasks, delays, proxies)),
  stop: tasks => dispatch(taskActions.stop(tasks)),
  remove: tasks => dispatch(taskActions.remove(tasks)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ActionBar);
