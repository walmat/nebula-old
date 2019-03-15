import PropTypes from 'prop-types';

import task from './task';

const taskLog = PropTypes.shape({
  id: task.id,
  site: task.site,
  output: task.output,
});

export default taskLog;
