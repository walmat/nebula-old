import React, { memo } from 'react';
import PropTypes from 'prop-types';
import tDefns from '../utils/definitions/taskDefinitions';
import { addTestId } from '../utils';

const LogTaskRow = ({
  onClick,
  selected,
  task: {
    index,
    site: { name },
    product: { found, raw },
    chosenSizes,
    sizes,
    proxy,
    output,
    checkoutUrl,
  },
  style,
  fullscreen,
}) => {
  const classMap = {
    id: ['col', 'tasks-row__log--id'],
    store: ['col', 'col--no-gutter', 'tasks-row__log--store'],
    product: ['col', 'col--no-gutter', 'tasks-row__log--product'],
    size: ['col', 'col--no-gutter', 'tasks-row__log--size'],
    proxy: ['col', 'col--no-gutter', 'tasks-row__log--proxy'],
    output: ['col', 'col--no-gutter', 'tasks-row__log--output'],
  };

  const outputColorMap = {
    'Waiting for captcha': 'warning',
    'Payment successful': 'success',
    'Card declined': 'failed',
    'Payment failed': 'failed',
  };

  const match = /Waiting for captcha|Payment successful|Payment failed|Card declined/i.exec(output);
  const messageClassName = match ? outputColorMap[match[0]] : 'normal';

  const tasksRow = `row ${selected ? 'tasks-row--selected' : 'tasks-row'}`;

  if (fullscreen) {
    Object.values(classMap).forEach(v => v.push(`${v[v.length - 1]}--fullscreen`));
  }

  const storeCss = checkoutUrl
    ? `${classMap.store.join(' ')} checkout-ready `
    : `${classMap.store.join(' ')}`;
  
  console.log('[DEBUG]: updating logTaskRow.jsx');
  return (
    <div
      key={index}
      style={style}
      className="tasks-row-container col"
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
          {chosenSizes || sizes}
        </div>
        <div
          className={classMap.proxy.join(' ')}
          data-testid={addTestId('LogTaskRow.proxy')}
          data-private
        >
          {proxy || 'None'}
        </div>
        <div
          className={`${classMap.output.join(' ')} tasks-row__log--${messageClassName}`}
          data-testid={addTestId('LogTaskRow.output')}
          role="button"
          tabIndex={0}
          onKeyPress={() => {}}
          onClick={() => LogTaskRow.openDefaultBrowser(checkoutUrl)}
        >
          {output}
        </div>
      </div>
    </div>
  );
};

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
  style: PropTypes.objectOf(PropTypes.any).isRequired,
  onClick: PropTypes.func.isRequired,
  selected: PropTypes.bool.isRequired,
  fullscreen: PropTypes.bool.isRequired,
};

LogTaskRow.openDefaultBrowser = url => {
  if (!url || !window.Bridge) {
    return;
  }

  window.Bridge.openInDefaultBrowser(url);
};

export default memo(LogTaskRow);
