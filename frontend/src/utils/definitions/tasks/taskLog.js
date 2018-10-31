import PropTypes from 'prop-types';

import task from './task';

export const initialTaskLogState = [];

const taskLog = PropTypes.arrayOf({
  id: task.id,
  site: task.site,
  output: task.output,
});

export default taskLog;
