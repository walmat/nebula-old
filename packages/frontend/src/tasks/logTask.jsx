import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';

export class LogTaskPrimitive extends Component {
  createTable() {
    const { tasks, fullscreen } = this.props;
    const runningTasks = tasks.filter(task => task.status === 'running');
    const table = runningTasks.map(t => <LogTaskRow key={t.index} task={t} fullscreen={fullscreen} />);
    return table;
  }

  render() {
    const { fullscreen } = this.props;
    return (
      <div>
        <div className="row row--start">
          <div className="col">
            <p className={`body-text section-header section-header--no-top ${fullscreen ? 'tasks-log__section-header__fullscreen' : 'tasks-log__section-header'}`}>
              Log
            </p>
          </div>
        </div>
        <div className="row">
          <div className={`col col--start tasks-log-container ${fullscreen ? 'tasks-log-container__fullscreen' : '' }`}>
            <div className="row row--start row--gutter-left row--gutter-right tasks-log__header">
              <div className="col tasks-log__header--id">
                <p>#</p>
              </div>
              <div className="col tasks-log__header--store">
                <p>Store</p>
              </div>
              <div className={`col ${!fullscreen ? 'tasks-log__header--product' : 'tasks-log__header--product__fullscreen' }`}>
                <p>Product</p>
              </div>
              <div className="col tasks-log__header--size">
                <p>Size</p>
              </div>
              <div className={`col ${!fullscreen ? 'tasks-log__header--proxy' : 'tasks-log__header--proxy__fullscreen' }`}>
                <p>Proxy</p>
              </div>
              <div className={`col ${!fullscreen ? 'tasks-log__header--output' : 'tasks-log__header--output__fullscreen' }`}>
                <p>Output</p>
              </div>
            </div>
            <div className="row row--start tasks-log__view-line">
              <div className="col col--expand">
                <hr className="view-line" />
              </div>
            </div>
            <div className="row row--expand">
              <div className="col tasks-table__wrapper">
                <div className={`tasks-log ${fullscreen ? 'tasks-log__fullscreen' : '' }`}>{this.createTable()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

LogTaskPrimitive.propTypes = {
  tasks: tDefns.taskList.isRequired,
  fullscreen: PropTypes.bool.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  tasks: state.tasks,
  fullscreen: ownProps.fullscreen,
});

export default connect(mapStateToProps)(LogTaskPrimitive);
