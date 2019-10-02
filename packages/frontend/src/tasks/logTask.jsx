import React, { PureComponent } from 'react';
import { InfiniteLoader, List, AutoSizer } from 'react-virtualized';
// import ScrollableFeed from 'react-scrollable-feed';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import tDefns from '../utils/definitions/taskDefinitions';
import { addTestId } from '../utils';

export class LogTaskPrimitive extends PureComponent {
  static renderOutputLogRow(msg, i) {
    const outputColorMap = {
      'Waiting for captcha': 'warning',
      'Duplicate order!': 'warning',
      'Checking order status': 'warning',
      'Polling queue': 'warning',
      'Payment successful': 'success',
      'Card declined': 'failed',
      'Payment failed': 'failed',
      'Checkout failed!': 'failed',
    };

    const match = /Waiting for captcha|Duplicate order!|Checking order status|Checkout failed!|Polling queue|Payment successful|Payment failed|Card declined/i.exec(
      msg,
    );
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
    this.isRowLoaded = this.isRowLoaded.bind(this);
    this.loadMoreRows = this.loadMoreRows.bind(this);
    this.renderMassChangeOptions = this.renderMassChangeOptions.bind(this);

    this.state = {
      fullscreen: false, // fullscreen toggle
    };
  }

  isRowLoaded({ index }) {
    const { tasks } = this.props;
    return !!tasks[index];
  }

  loadMoreRows({ start, stop }) {
    const { tasks } = this.props;
    return tasks.slice(start, stop);
  }

  createTable() {
    const { tasks } = this.props;

    return (
      <InfiniteLoader
        isRowLoaded={this.isRowLoaded}
        loadMoreRows={this.loadMoreRows}
        rowCount={tasks.length}
      >
        {({ onRowsRendered, registerChild }) => (
          <AutoSizer>
            {({ width, height }) => (
              <List
                tasks={tasks}
                width={width}
                height={height}
                onRowsRendered={onRowsRendered}
                ref={registerChild}
                rowHeight={30}
                rowRenderer={this.renderRow}
                rowCount={tasks.length}
                overscanRowCount={20}
              />
            )}
          </AutoSizer>
        )}
      </InfiniteLoader>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderMassChangeOptions() {
    return <></>;
  }

  renderRow({ index, key, style }) {
    const { tasks } = this.props;
    const task = tasks[index];
    const { fullscreen } = this.state;

    return (
      <LogTaskRow key={key} style={style} task={task} fullscreen={fullscreen} selected={false} />
    );
  }

  render() {
    const { fullscreen } = this.state;
    const classMap = {
      sectionHeader: [
        'body-text',
        'section-header',
        'section-header--no-top',
        'tasks-log__section-header',
      ],
      container: ['col', 'col--start', 'col--expand', 'tasks-log-container'],
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
      <div className="col col--start col--expand">
        <div className="row row--start">
          <div className="col col--expand">
            <p
              className={classMap.sectionHeader.join(' ')}
              data-testid={addTestId('LogTaskPrimitive.sectionHeader')}
            >
              Log
            </p>
          </div>
        </div>
        <div className="row row--expand row--start">
          <div
            data-testid={addTestId('LogTaskPrimitive.container')}
            className={classMap.container.join(' ')}
          >
            <div
              onDoubleClick={() =>
                this.setState({
                  fullscreen: !fullscreen,
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
          </div>
        </div>
        {this.renderMassChangeOptions()}
      </div>
    );
  }
}

LogTaskPrimitive.propTypes = {
  tasks: tDefns.taskList.isRequired,
};

export const mapStateToProps = state => ({
  tasks: state.tasks.filter(
    t => t.status === 'running' || t.status === 'success' || t.status === 'used',
  ),
});

export default connect(mapStateToProps)(LogTaskPrimitive);
