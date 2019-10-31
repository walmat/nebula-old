import PropTypes from 'prop-types';

import task from './task';

const taskLog = PropTypes.shape({
  id: task.id,
  site: task.site,
  product: PropTypes.shape({ found: PropTypes.string, raw: PropTypes.string }),
  size: task.size,
  proxy: PropTypes.string,
  output: task.output,
});

export default taskLog;
