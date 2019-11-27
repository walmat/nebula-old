import prevState from '../v0.3.0/state';

const updateTask = task => ({
  ...task,
  product: {
    ...task.product,
    found: null,
  },
  proxy: null,
  log: [],
});

const newState = {
  ...prevState,
  version: '0.3.1',
  newTask: updateTask(prevState.newTask),
  tasks: prevState.tasks.map(updateTask),
  selectedTask: updateTask(prevState.selectedTask),
};

export default newState;
