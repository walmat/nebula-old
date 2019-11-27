import prevState from '../v0.2.1/state';

const updateTask = task => ({ ...task, chosenSizes: task.sizes });

const newState = {
  ...prevState,
  version: '0.3.0',
  newTask: updateTask(prevState.newTask),
  tasks: prevState.tasks.map(updateTask),
  selectedTask: updateTask(prevState.selectedTask),
};

export default newState;
