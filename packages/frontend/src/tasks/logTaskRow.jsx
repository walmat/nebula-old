import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

const LogTaskRow =
  ({
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
  }) => (
  <div className="tasks-row-container col" onClick={onClick}>
    <div key={index} className={`${selected ? 'tasks-row__selected' : 'tasks-row'} row`}>
      <div className={`col ${!fullscreen ? 'tasks-row__log--id' : 'tasks-row__log--id__fullscreen'}`}>
        {index < 10 ? `0${index}` : index}
      </div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--store' : 'col--no-gutter tasks-row__log--store__fullscreen' }`}>{name}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--product' : 'col--no-gutter tasks-row__log--product__fullscreen' }`}>{found || raw}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--size' : 'col--no-gutter tasks-row__log--size__fullscreen' }`}>{chosenSizes || sizes}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--proxy' : 'col--no-gutter tasks-row__log--proxy__fullscreen' }`}>{proxy || 'None'}</div>
      <div className="col tasks-row__log--output">{output}</div>
    </div>
  </div>
);

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default LogTaskRow;
