/* eslint-disable react/default-props-match-prop-types */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import tDefns from '../../state/definitions/taskDefinitions';
import { addTestId } from '../../utils';

const OutputCol = ({ message, classMap, checkoutUrl }) => {
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
    message,
  );
  const messageClassName = match ? messageColorMap[match[0]] : 'normal';

  return (
    <div
      className={`${classMap.message.join(' ')} tasks-row__log--${messageClassName}`}
      data-testid={addTestId('LogTaskRow.message')}
      role="button"
      tabIndex={0}
      onKeyPress={() => {}}
      onClick={() => OutputCol.openDefaultBrowser(checkoutUrl)}
    >
      {message}
    </div>
  );
};

OutputCol.propTypes = {
  message: PropTypes.string.isRequired,
  classMap: PropTypes.any.isRequired,
  checkoutUrl: PropTypes.string,
};

OutputCol.defaultProps = {
  checkoutUrl: null,
};

const LogTaskRow = ({
  onClick,
  selected,
  task: {
    index,
    site: { name },
    product: { found, raw },
    chosenSize,
    sizes,
    proxy,
    message,
    checkoutUrl,
  },
  style,
  fullscreen,
}) => {
  const classMap = {
    id: ['col', 'col--no-gutter', 'tasks-row__log--id'],
    store: ['col', 'col--no-gutter', 'tasks-row__log--store'],
    product: ['col', 'col--no-gutter', 'tasks-row__log--product'],
    size: ['col', 'col--no-gutter', 'tasks-row__log--size'],
    proxy: ['col', 'col--no-gutter', 'tasks-row__log--proxy'],
    message: ['col', 'col--no-gutter', 'tasks-row__log--message'],
  };

  const tasksRow = `row row--gutter ${selected ? 'tasks-row--selected' : 'tasks-row'}`;

  if (fullscreen) {
    Object.values(classMap).forEach(v => v.push(`${v[v.length - 1]}--fullscreen`));
  }

  const storeCss = checkoutUrl
    ? `${classMap.store.join(' ')} checkout-ready `
    : `${classMap.store.join(' ')}`;

  return (
    <div
      key={index}
      style={style}
      className="tasks-row-container col col--no-gutter"
      data-testid={addTestId('LogTaskRow.container')}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyPress={() => {}}
    >
      <div className={tasksRow}>
        <div className={classMap.id.join(' ')} data-testid={addTestId('LogTaskRow.id')}>
          {index < 10 ? `0${index}` : index}
        </div>
        <div className={storeCss} data-testid={addTestId('LogTaskRow.store')}>
          {name}
        </div>
        <div className={classMap.product.join(' ')} data-testid={addTestId('LogTaskRow.product')}>
          {found || raw}
        </div>
        <div className={classMap.size.join(' ')} data-testid={addTestId('LogTaskRow.size')}>
          {chosenSize || sizes}
        </div>
        <div
          className={classMap.proxy.join(' ')}
          data-testid={addTestId('LogTaskRow.proxy')}
          data-private
        >
          {proxy || 'None'}
        </div>
        <OutputCol message={message} classMap={classMap} checkoutUrl={checkoutUrl} />
      </div>
    </div>
  );
};

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
  onClick: PropTypes.func,
  selected: PropTypes.bool.isRequired,
  fullscreen: PropTypes.bool.isRequired,
};

LogTaskRow.defaultProps = {
  onClick: () => {},
};

OutputCol.openDefaultBrowser = url => {
  if (!url || !window.Bridge) {
    return;
  }

  window.Bridge.openInDefaultBrowser(url);
};

export default LogTaskRow;
