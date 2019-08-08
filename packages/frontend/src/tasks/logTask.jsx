import React, { PureComponent } from 'react';
import { List, AutoSizer } from 'react-virtualized';
import ScrollableFeed from 'react-scrollable-feed';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';
import { addTestId } from '../utils';

export class LogTaskPrimitive extends PureComponent {
  static renderOutputLogRow(msg, i) {
    const outputColorMap = {
      'Waiting for captcha': 'warning',
      'Payment successful': 'success',
      'Payment failed': 'failed',
    };
    const match = /Waiting for captcha|Payment successful|Payment failed/.exec(msg);
    const messageClassName = match ? outputColorMap[match[0]] : 'normal';
    return (
      <div key={i} className="row row--start row--gutter tasks-live-log__output-row">
        <p className={`tasks-live-log__output-row-message--${messageClassName}`}>{msg}</p>
      </div>
    );
  }

  constructor(props) {
    super(props);

    this.createTable = this.createTable.bind(this);
    this.renderRow = this.renderRow.bind(this);

    this.state = {
      fullscreen: false, // fullscreen toggle
      selected: [], // list of selected tasks
      focused: '', // task in focused (used for showing the log data)
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props !== nextProps) {
      this.list.forceUpdateGrid();
    }
  }

  selectRow(e, taskId) {
    // let { selected } = this.state;
    const { fullscreen, focused } = this.state;
    if (!fullscreen) {
      return;
    }

    if (taskId === focused) {
      this.setState({ focused: '', selected: [] });
    } else {
      this.setState({ focused: taskId, selected: [taskId] });
    }
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
              <ScrollableFeed data-testid={addTestId('LogTaskPrimitive.feed')}>
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
    const { focused, selected } = this.state;

    if (!tasks || (!tasks.length && (focused || selected.length))) {
      this.setState({
        selected: [],
        focused: '',
      });
    }

    return (
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={r => {
              this.list = r;
            }}
            width={width}
            height={height}
            rowHeight={30}
            rowRenderer={this.renderRow}
            rowCount={tasks.length}
            overscanRowCount={10}
          />
        )}
      </AutoSizer>
    );
  }

  renderRow({ index, key, style }) {
    const { tasks } = this.props;
    const { fullscreen, selected } = this.state;

    const selectedMap = {};
    selected.forEach(id => {
      selectedMap[id] = id;
    });

    return (
      <LogTaskRow
        key={key}
        onClick={e => this.selectRow(e, tasks[index].id)}
        selected={!!selectedMap[tasks[index].id]}
        style={style}
        task={tasks[index]}
        fullscreen={fullscreen}
      />
    );
  }

  render() {
    console.log('[DEBUG]: updating logTask.jsx');
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
            <p
              className={classMap.sectionHeader.join(' ')}
              data-testid={addTestId('LogTaskPrimitive.sectionHeader')}
            >
              Log
            </p>
          </div>
        </div>
        <div className="row">
          <div
            data-testid={addTestId('LogTaskPrimitive.container')}
            className={classMap.container.join(' ')}
          >
            <div
              onDoubleClick={() =>
                this.setState({
                  fullscreen: !fullscreen,
                  selected: fullscreen ? [] : selected, // opposite toggle for coming in/out of FS mode
                  focused: fullscreen ? '' : focused, // opposite toggle for coming in/out of FS mode
                })
              }
              data-testid={addTestId('LogTaskPrimitive.tableHeader')}
              className={classMap.tableHeader.join(' ')}
            >
              <div
                data-testid={addTestId('LogTaskPrimitive.header--id')}
                className="col tasks-log__header--id"
              >
                <p>#</p>
              </div>
              <div
                data-testid={addTestId('LogTaskPrimitive.header--store')}
                className="col tasks-log__header--store"
              >
                <p>Store</p>
              </div>
              <div
                data-testid={addTestId('LogTaskPrimitive.header--product')}
                className={classMap.product.join(' ')}
              >
                <p>Product</p>
              </div>
              <div
                data-testid={addTestId('LogTaskPrimitive.header--size')}
                className="col tasks-log__header--size"
              >
                <p>Size</p>
              </div>
              <div
                data-testid={addTestId('LogTaskPrimitive.header--proxy')}
                className={classMap.proxy.join(' ')}
              >
                <p>Proxy</p>
              </div>
              <div
                data-testid={addTestId('LogTaskPrimitive.header--output')}
                className={classMap.output.join(' ')}
              >
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
  tasks: state.tasks.filter(t => t.status === 'running'),
});

export default connect(mapStateToProps)(LogTaskPrimitive);
