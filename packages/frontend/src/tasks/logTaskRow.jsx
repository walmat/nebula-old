import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

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
      output
    },
    fullscreen
  }) => {
  const classMap = {
    id: ['col', 'tasks-row__log--id'],
    store: ['col', 'col--no-gutter', 'tasks-row__log--store'],
    product: ['col', 'col--no-gutter', 'tasks-row__log--product'],
    size: ['col', 'col--no-gutter', 'tasks-row__log--size'],
    proxy: ['col', 'col--no-gutter', 'tasks-row__log--proxy'],
    output: ['col', 'col--no-gutter', 'tasks-row__log--output'],
  }

  const tasksRow = `row ${selected ? 'tasks-row--selected' : 'tasks-row'}`;

  if (fullscreen) {
    Object.values(classMap).forEach(v => v.push(`${v[v.length - 1]}--fullscreen`));
  }
  return (
    <div className="tasks-row-container col" onClick={onClick}>
      <div key={index} className={tasksRow}>
        <div className={classMap.id.join(' ')}>
          {index < 10 ? `0${index}` : index}
        </div>
        <div className={classMap.store.join(' ')}>{name}</div>
        <div className={classMap.product.join(' ')}>{found || raw}</div>
        <div className={classMap.size.join(' ')}>{chosenSizes || sizes}</div>
        <div className={classMap.proxy.join(' ')}>{proxy || 'None'}</div>
        <div className={classMap.output.join(' ')}>{output}</div>
      </div>
    </div>
  );
};

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default LogTaskRow;
