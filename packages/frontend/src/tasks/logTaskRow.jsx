import React from 'react';
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
  },
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

  const tasksRow = `row ${selected ? 'tasks-row--selected' : 'tasks-row'}`;

  if (fullscreen) {
    Object.values(classMap).forEach(v => v.push(`${v[v.length - 1]}--fullscreen`));
  }
  return (
    <div
      key={index}
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
        <div className={classMap.store.join(' ')} data-testid={addTestId('LogTaskRow.store')}>
          {name}
        </div>
        <div className={classMap.product.join(' ')} data-testid={addTestId('LogTaskRow.product')}>
          {found || raw}
        </div>
        <div className={classMap.size.join(' ')} data-testid={addTestId('LogTaskRow.size')}>
          {chosenSizes || sizes}
        </div>
        <div className={classMap.proxy.join(' ')} data-testid={addTestId('LogTaskRow.proxy')}>
          {proxy || 'None'}
        </div>
        <div className={classMap.output.join(' ')} data-testid={addTestId('LogTaskRow.output')}>
          {output}
        </div>
      </div>
    </div>
  );
};

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
  onClick: PropTypes.func.isRequired,
  selected: PropTypes.bool.isRequired,
  fullscreen: PropTypes.bool.isRequired,
};

export default LogTaskRow;
