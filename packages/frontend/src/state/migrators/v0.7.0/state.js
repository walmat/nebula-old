import prevState from '../v0.6.1/state';
import TYPES from '../../../constants/taskTypes';

const updateTask = task => ({
  ...task,
  type: TYPES.SAFE,
});

export default {
  ...prevState,
  version: '0.7.0',
  tasks: prevState.tasks.map(updateTask),
  newTask: updateTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
};