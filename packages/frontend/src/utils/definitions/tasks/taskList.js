import PropTypes from 'prop-types';

import task from './task';

export const initialTaskListState = [];

const taskList = PropTypes.arrayOf(task);

export default taskList;
