import prevState from '../v0.7.0/state';

const updateTask = task => {
  const newTask = {
    ...task,
    forceCaptcha: false,
  };

  delete newTask.isQueueBypass;
  return newTask;
};


export default {
  ...prevState,
  version: '0.7.1',
  tasks: prevState.tasks.map(updateTask),
  newTask: updateTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
};
