import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { InfiniteLoader, List, AutoSizer } from 'react-virtualized';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import { makeTasks } from '../state/selectors';
import { addTestId } from '../../utils';

export class LogTaskPrimitive extends PureComponent {
  static renderOutputLogRow(msg, i) {
    const messageColorMap = {
      'Waiting for captcha': 'warning',
      'Checkpoint captcha': 'warning',
      'Duplicate order': 'warning',
      'Checking order status': 'warning',
      'Polling queue': 'warning',
      'Payment successful': 'success',
      'Card declined': 'failed',
      'Payment failed': 'failed',
      'Checkout failed': 'failed',
    };

    const match = /Waiting for captcha|Checkpoint captcha|Duplicate order|Checking order status|Checkout failed|Polling queue|Payment successful|Payment failed|Card declined/i.exec(
      msg,
    );
    const messageClassName = match ? messageColorMap[match[0]] : 'normal';
    return (
      <div key={i} className="row row--start row--gutter tasks-live-log__message-row">
        <p className={`tasks-live-log__message-row-message--${messageClassName}`}>{msg}</p>
      </div>
    );
  }

  static renderRow({ key, style, isVisible, task, fullscreen }) {
    if (!isVisible) {
      return null;
    }
    return (
      <LogTaskRow key={key} style={style} task={task} fullscreen={fullscreen} selected={false} />
    );
  }

  static isRowLoaded({ index, tasks }) {
    return !!tasks[index];
  }

  static loadMoreRows({ startIndex, stopIndex, tasks }) {
    return tasks.slice(startIndex, stopIndex);
  }

  constructor(props) {
    super(props);

    this.createTable = this.createTable.bind(this);

    this.state = {
      fullscreen: false, // fullscreen toggle
    };
  }

  createTable() {
    const { fullscreen } = this.state;
    const { tasks } = this.props;
    const runningTasks = tasks.filter(t => t.status === 'running');

    return (
      <InfiniteLoader
        isRowLoaded={({ index }) => LogTaskPrimitive.isRowLoaded({ index, tasks: runningTasks })}
        loadMoreRows={({ startIndex, stopIndex }) =>
          LogTaskPrimitive.loadMoreRows({ startIndex, stopIndex, tasks: runningTasks })
        }
        rowCount={runningTasks.length}
      >
        {({ onRowsRendered, registerChild }) => (
          <AutoSizer>
            {({ width, height }) => (
              <List
                width={width}
                height={height}
                onRowsRendered={onRowsRendered}
                ref={registerChild}
                rowHeight={30}
                rowRenderer={({ index, key, style, isVisible }) =>
                  LogTaskPrimitive.renderRow({
                    key,
                    style,
                    isVisible,
                    task: runningTasks[index],
                    fullscreen,
                  })
                }
                rowCount={runningTasks.length}
                overscanRowCount={0}
              />
            )}
          </AutoSizer>
        )}
      </InfiniteLoader>
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
      message: ['col', 'tasks-log__header', 'tasks-log__header--message'],
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
                data-testid={addTestId('LogTaskPrimitive.header--message')}
                className={classMap.message.join(' ')}
              >
                <p>Status</p>
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
      </div>
    );
  }
}

LogTaskPrimitive.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  tasks: makeTasks(state),
});

export default connect(mapStateToProps)(LogTaskPrimitive);
