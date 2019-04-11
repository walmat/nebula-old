import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

const LogTaskRow = ({ key, task, fullscreen }) => (
  <div className="tasks-row-container col">
    <div key={key} className="tasks-row row">
      <div className={`col ${!fullscreen ? 'tasks-row__log--id' : 'tasks-row__log--id__fullscreen'}`}>
        {task.index < 10 ? `0${task.index}` : task.index}
      </div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--store' : 'col--no-gutter tasks-row__log--store__fullscreen' }`}>{task.site.name}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--product' : 'col--no-gutter tasks-row__log--product__fullscreen' }`}>{task.product.found || task.product.raw}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--size' : 'col--no-gutter tasks-row__log--size__fullscreen' }`}>{task.chosenSizes || task.sizes}</div>
      <div className={`col ${!fullscreen ? 'col--no-gutter tasks-row__log--proxy' : 'col--no-gutter tasks-row__log--proxy__fullscreen' }`}>{task.proxy || 'None'}</div>
      <div className="col tasks-row__log--output">{task.output}</div>
    </div>
  </div>
);

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default LogTaskRow;
