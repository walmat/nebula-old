import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

const LogTaskRow = ({ task }) => (
  <div className="tasks-row-container col">
    <div key={task.index} className="tasks-row row">
      <div className="col tasks-row__log--id">
        {task.index < 10 ? `0${task.index}` : task.index}
      </div>
      <div className="col col--no-gutter tasks-row__log--site">{task.site.name}</div>
      <div className="col col--no-gutter tasks-row__log--size">{task.sizes}</div>
      <div className="col tasks-row__log--output">{task.output.message}</div>
    </div>
  </div>
);

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default LogTaskRow;
