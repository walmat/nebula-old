import PropTypes from 'prop-types';

import task from './task';

export const initialTaskLogState = {
  id: null,
  site: null,
  output: null,
};

const taskLog = PropTypes.shape({
  id: task.id,
  site: task.site,
  output: task.output,
});

export default taskLog;
