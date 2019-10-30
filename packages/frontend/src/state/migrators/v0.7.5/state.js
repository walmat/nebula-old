import prevState from '../v0.7.4/state';

const updateTask = task => {
  const newTask = task;
  delete newTask.username;
  delete newTask.password;
  delete newTask.log;

  newTask.account = null;

  return newTask;
};

export default {
  ...prevState,
  version: '0.7.5',
  newTask: updateTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
  tasks: prevState.tasks.map(updateTask),
};
