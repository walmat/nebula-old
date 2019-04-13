import React from 'react';
import tDefns from '../utils/definitions/taskDefinitions';

const LogTaskRow = ({
  task: {
    index,
    chosenSizes,
    sizes,
    output,
    site: { name },
  },
}) => (
  <div className="tasks-row-container col">
    <div key={index} className="tasks-row row">
      <div className="col tasks-row__log--id">{index < 10 ? `0${index}` : index}</div>
      <div className="col col--no-gutter tasks-row__log--site">{name}</div>
      <div className="col col--no-gutter tasks-row__log--size">{chosenSizes || sizes}</div>
      <div className="col tasks-row__log--output">{output}</div>
    </div>
  </div>
);

LogTaskRow.propTypes = {
  task: tDefns.taskLog.isRequired,
};

export default LogTaskRow;
