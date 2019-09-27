import prevState from '../v0.7.7/state';

const updateNewTask = task => {
  const newTask = task;

  // delete old values
  delete newTask.sizes;
  delete newTask.chosenSizes;
  delete newTask.username;
  delete newTask.password;

  // add new values
  newTask.amount = task.amount || 0;
  newTask.oneCheckout = false;
  newTask.restockMode = false;
  newTask.checkoutDelay = 0;

  return newTask;
};

const updateTask = task => {
  const newTask = task;

  // delete old values
  delete newTask.sizes;
  delete newTask.chosenSizes;
  delete newTask.username;
  delete newTask.password;
  delete newTask.amount;

  return newTask;
};

export default {
  ...prevState,
  version: '0.8.0',
  newTask: updateNewTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
  tasks: prevState.tasks.map(updateTask),
};
