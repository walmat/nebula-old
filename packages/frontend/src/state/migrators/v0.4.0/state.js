import prevState from '../v0.3.1/state';

const newState = {
  ...prevState,
  version: '0.4.0',
  tasks: prevState.tasks.filter(t => `${t.index}`.indexOf('-') === -1),
};

export default newState;
