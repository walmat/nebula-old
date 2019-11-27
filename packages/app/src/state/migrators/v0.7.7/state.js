import prevState from '../v0.7.6/state';

const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
};

const updateTask = task => {
  const newTask = task;
  newTask.platform = Platforms.Shopify;

  return newTask;
};

export default {
  ...prevState,
  version: '0.7.7',
  newTask: updateTask(prevState.newTask),
  selectedTask: updateTask(prevState.selectedTask),
  tasks: prevState.tasks.map(updateTask),
};
