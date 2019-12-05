import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Delays from './delays';
import { appActions } from '../../app/state/actions';
import { taskActions } from '../state/actions';
import { makeSelectedTasks } from '../state/selectors';
import { makeDelays, makeProxies } from '../../settings/state/selectors';

const ActionBar = ({ toggleCreate, tasks, delays, proxies, start, stop, remove }) => (
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
  tasks: makeSelectedTasks(state),
  delays: makeDelays(state),
  proxies: makeProxies(state),
});

const mapDispatchToProps = dispatch => ({
  toggleCreate: () => dispatch(appActions.toggleCreate()),
  start: (tasks, delays, proxies) => dispatch(taskActions.start(tasks, delays, proxies)),
  stop: tasks => dispatch(taskActions.start(tasks)),
  remove: tasks => dispatch(taskActions.start(tasks)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ActionBar);
