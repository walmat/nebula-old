import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

const LogTaskRow = props => (
  (
    <div className="tasks-row-container col">
      <div key={props.task.id} className="tasks-row row">
        <div className="col tasks-row__log--id">{props.task.id < 10 ? `0${props.task.id}` : props.task.id}</div>
        <div className="col col--no-gutter tasks-row__log--site">{props.task.site.name}</div>
        <div className="col tasks-row__log--output">{props.task.output || 'Monitoring...'}</div>
      </div>
    </div>
  )
);

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default (LogTaskRow);
