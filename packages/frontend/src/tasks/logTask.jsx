import React, { Component } from 'react';
import ScrollableFeed from 'react-scrollable-feed';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';

export class LogTaskPrimitive extends Component {
  // static massLinkChange() {
  //   if (window.Bridge) {
  //     // TODO: CREATE DIALOG TO ALLOW INPUT (issue: #414)
  //   }
  // }

  // static massPasswordChange() {
  //   if (window.Bridge) {
  //     // TODO: CREATE DIALOG TO ALLOW INPUT (issue: #414)
  //   }
  // }

  static renderOutputLogRow(msg, i) {
    return (
      <div key={i} className="row row--start row--gutter tasks-live-log__output-row">
        <p>{msg}</p>
      </div>
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      fullscreen: false, // fullscreen toggle
      selected: [], // list of selected tasks
      focused: '', // task in focused (used for showing the log data)
    };
  }

  selectRow(e, taskId) {
    // let { selected } = this.state;
    const { fullscreen } = this.state;
    if (!fullscreen) {
      return;
    }

    // console.log(e.shiftKey);
    // TODO: batch select/deselect (issue: #414)
    // if (taskId && !selected.includes(taskId)) {
    //   selected.push(taskId);
    //   this.setState({ focused: taskId });
    // } else {
    //   selected = selected.filter(t => t !== taskId);
    //   this.setState({ focused: selected[selected.length - 1] });
    // }
    this.setState({ focused: taskId, selected: [taskId] });
  }

  showLiveLog() {
    const { focused } = this.state;
    if (focused) {
      const { tasks } = this.props;
      const task = tasks.find(t => t.id === focused);
      if (task) {
        return (
          <div className="row row--start row--expand table--lower">
            <div className="col col--start col--no-gutter tasks-live-log__wrapper">
              <ScrollableFeed>
                {task.log.map((msg, i) => LogTaskPrimitive.renderOutputLogRow(msg, i))}
              </ScrollableFeed>
            </div>
          </div>
        );
      }
      this.setState({ focused: '' });
    }
    return null;
  }

  createTable() {
    const { tasks } = this.props;
    const { fullscreen, focused, selected } = this.state;
    const runningTasks = tasks.filter(
      task => task.status === 'running' || task.status === 'finished',
    );

    if (!runningTasks.length && (focused || selected.length)) {
      this.setState({
        selected: [],
        focused: '',
      });
    }

    const selectedMap = {};
    selected.forEach(id => {
      selectedMap[id] = id;
    });
    const table = runningTasks.map(t => (
      <LogTaskRow
        onClick={e => this.selectRow(e, t.id)}
        selected={!!selectedMap[t.id]}
        task={t}
        fullscreen={fullscreen}
      />
    ));
    return table;
  }

  // renderMassChangeOptions() {
  //   const { selected, focused } = this.state;

  //   if (focused || selected.length) {
  //     return (
  //       <div>
  //         <button
  //           type="button"
  //           className="tasks-log__button--links"
  //           onClick={() => LogTaskPrimitive.massLinkChange()}
  //         >
  //           Mass Link
  //         </button>
  //         <button
  //           type="button"
  //           className="tasks-log__button--password"
  //           onClick={() => LogTaskPrimitive.massPasswordChange()}
  //         >
  //           Password
  //         </button>
  //       </div>
  //     );
  //   }
  //   return null;
  // }

  render() {
    const { fullscreen, selected, focused } = this.state;
    const classMap = {
      sectionHeader: [
        'body-text',
        'section-header',
        'section-header--no-top',
        'tasks-log__section-header',
      ],
      container: ['col', 'col--start', 'tasks-log-container'],
      tableHeader: [
        'row',
        'row--start',
        'row--gutter-left',
        'row--gutter-right',
        'tasks-log__header',
      ],
      product: ['col', 'tasks-log__header--product'],
      proxy: ['col', 'tasks-log__header', 'tasks-log__header--proxy'],
      output: ['col', 'tasks-log__header', 'tasks-log__header--output'],
    };
    if (fullscreen) {
      Object.values(classMap).forEach(v => v.push(`${v[v.length - 1]}--fullscreen`));
    }
    return (
      <div>
        <div className="row row--start">
          <div className="col">
            <p className={classMap.sectionHeader.join(' ')}>Log</p>
          </div>
        </div>
        <div className="row">
          <div className={classMap.container.join(' ')}>
            <div
              onDoubleClick={() =>
                this.setState({
                  fullscreen: !fullscreen,
                  selected: fullscreen ? [] : selected, // opposite toggle for coming in/out of FS mode
                  focused: fullscreen ? '' : focused, // opposite toggle for coming in/out of FS mode
                })
              }
              className={classMap.tableHeader.join(' ')}
            >
              <div className="col tasks-log__header--id">
                <p>#</p>
              </div>
              <div className="col tasks-log__header--store">
                <p>Store</p>
              </div>
              <div className={classMap.product.join(' ')}>
                <p>Product</p>
              </div>
              <div className="col tasks-log__header--size">
                <p>Size</p>
              </div>
              <div className={classMap.proxy.join(' ')}>
                <p>Proxy</p>
              </div>
              <div className={classMap.output.join(' ')}>
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
                <div className="tasks-log">{this.createTable()}</div>
              </div>
            </div>
            {fullscreen ? this.showLiveLog() : null}
          </div>
        </div>
        {/* TODO: Add this back in with #414 */}
        {/* {focused || selected.length ? this.renderMassChangeOptions() : null} */}
      </div>
    );
  }
}

LogTaskPrimitive.propTypes = {
  tasks: tDefns.taskList.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks,
});

export default connect(mapStateToProps)(LogTaskPrimitive);
