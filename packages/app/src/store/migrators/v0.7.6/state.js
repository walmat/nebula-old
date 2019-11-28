import prevState from '../v0.7.5/state';

const updateTaskEdits = task => {
  const newTask = task;
  delete newTask.edits.sizes;
  delete newTask.edits.username;
  delete newTask.edits.password;

  return newTask;
};

export default {
  ...prevState,
  version: '0.7.6',
  selectedTask: updateTaskEdits(prevState.selectedTask),
  tasks: prevState.tasks.map(updateTaskEdits),
};
