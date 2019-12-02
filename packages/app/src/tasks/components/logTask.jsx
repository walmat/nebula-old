import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import { connect } from 'react-redux';
import LogTaskRow from './logTaskRow';
import { makeRunningTasks } from '../state/selectors';
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

  constructor(props) {
    super(props);

    this.createTable = this.createTable.bind(this);
    this.renderRow = this.renderRow.bind(this);

    this.state = {
      fullscreen: false, // fullscreen toggle
    };
  }

  createTable() {
    const { tasks } = this.props;

    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemSize={30}
            itemData={tasks}
            itemCount={tasks.length}
          >
            {this.renderRow}
          </List>
        )}
      </AutoSizer>
    );
  }

  renderRow({ data, index, style }) {
    const { fullscreen } = this.state;

    const task = data[index];
    return (
      <LogTaskRow
        index={index}
        style={style}
        task={task}
        fullscreen={fullscreen}
        selected={false}
      />
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
  tasks: makeRunningTasks(state),
});

export default connect(mapStateToProps)(LogTaskPrimitive);
