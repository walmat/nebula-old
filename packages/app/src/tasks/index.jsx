import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import ViewTask from './components/viewTask';
import CreateTask from './components/createTask';

import '../styles/index.scss';
import './styles/index.scss';
import { appActions } from '../app/state/actions';

import { renderSvgIcon } from '../utils';

import { ReactComponent as CreateIcon } from '../styles/images/tasks/create.svg';
import { ReactComponent as StartAllIcon } from '../styles/images/tasks/start-all.svg';
import { ReactComponent as StopAllIcon } from '../styles/images/tasks/stop-all.svg';
import { ReactComponent as DestroyAllIcon } from '../styles/images/tasks/destroy-all.svg';

const Tasks = ({ toggleCreate, show }) => (
  <div className="container tasks">
    <div className="row row--expand" style={{ width: '100%' }}>
      <div className="col col--expand col--start" style={{ flexGrow: 0.5, width: '100%' }}>
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header tasks__title">Tasks</h1>
          </div>
        </div>
        <div className="row row--expand" style={{ marginTop: 15 }}>
          <div className="col col--expand">
            <div className="row row--expand">
              <div className="col col--start col--expand col--no-gutter-left">
                <CreateTask show={show} toggleCreate={toggleCreate} />
                <ViewTask />
              </div>
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 15 }}>
          <div className="row row--gutter" style={{ justifyContent: 'center' }}>
            <div className="col">
              <div
                className="bulk-action-sidebar__button"
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
                onClick={toggleCreate}
              >
                {renderSvgIcon(CreateIcon, { alt: '' })}
              </div>
            </div>
            <div className="col">
              <div
                className="bulk-action-sidebar__button"
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
                // onClick={() => this.startAllTasks()}
              >
                {renderSvgIcon(StartAllIcon, { alt: 'start all' })}
              </div>
            </div>
            <div className="col">
              <div
                className="bulk-action-sidebar__button"
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
                // onClick={() => this.stopAllTasks()}
              >
                {renderSvgIcon(StopAllIcon, { alt: 'stop all' })}
              </div>
            </div>
            <div className="col">
              <div
                className="bulk-action-sidebar__button"
                role="button"
                tabIndex={0}
                onKeyPress={() => {}}
                // onClick={() => this.removeAllTasks()}
              >
                {renderSvgIcon(DestroyAllIcon, { alt: 'destroy all' })}
              </div>
            </div>
            <div className="col">
              <div>test</div>
            </div>
            <div className="col">
              <div>test</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Tasks.propTypes = {
  show: PropTypes.bool.isRequired,
  toggleCreate: PropTypes.func.isRequired,
};

const mapDispatchToProps = dispatch => ({
  toggleCreate: () => dispatch(appActions.toggleCreate()),
});

export default connect(
  state => ({ show: state.App.toggleCreate }),
  mapDispatchToProps,
)(Tasks);
