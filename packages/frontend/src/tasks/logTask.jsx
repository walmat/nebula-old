import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';

export class LogTaskPrimitive extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: [],
      focused: '',
    }
  }

  selectRow(taskId) {
    let { selected } = this.state;
    if (taskId && !selected.includes(taskId)) {
      selected.push(taskId);
      this.setState({ focused: taskId });
    } else {
      selected = selected.filter(e => e !== taskId);
      this.setState({ focused: selected[selected.length - 1]})
    }
    this.setState({ selected });
  }

  renderOutputLogRow(msg) {
    return (
      <div className="row row--start row--gutter tasks-live-log__output-row">
        <p>{msg}</p>
      </div>
    );
  }

  showLiveLog() {
    const { tasks } = this.props;
    const { focused } = this.state;
    const task = tasks.find(t => t.id === focused);
    if (focused) {
      return (
        <div className="row row--expand table--lower">
          <div className="col col--start tasks-live-log__wrapper">
            {task.log.map(msg => this.renderOutputLogRow(msg))}
          </div>
        </div>
      );
    }
  }

  createTable() {
    const { tasks, fullscreen } = this.props;
    const { selected } = this.state;
    const runningTasks = tasks.filter(task => task.status === 'running' || task.status === 'finished');
    const table = runningTasks.map(t =>
      <LogTaskRow
        onClick={() =>this.selectRow(t.id)}
        key={t.index}
        selected={selected.find(e => e === t.id)}
        task={t}
        fullscreen={fullscreen}
      />
    );
    // TODO: ADD IN LIVE LOG AREA TOGGLING HERE?
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
            <div className="row row--expand table--upper">
              <div className="col tasks-table__wrapper">
                <div className={`tasks-log ${fullscreen ? 'tasks-log__fullscreen' : '' }`}>{this.createTable()}</div>
              </div>
            </div>
            { fullscreen ? this.showLiveLog() : null }
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
