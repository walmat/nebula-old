/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.3.0';
import initialState from '../../../state/migrators/v0.3.0/state';
import prevState from '../../../state/migrators/v0.2.1/state';

describe('v0.3.0 migrator', () => {
  const updateTask = task => ({ ...task, chosenSizes: task.sizes });

  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should update lower versions', () => {
    const start = {
      ...initialState,
      version: '0.2.1',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(initialState);
  });

  it('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.3.1',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  it('should add chosenSizes sizes to new tasks if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    expect(migrated.newTask.chosenSizes).toBe(migrated.newTask.sizes);
    expect(migrated).toEqual(initialState);
  });

  it('should not modify chosenSizes to new tasks if it is present', () => {
    const start = { ...initialState };
    start.newTask.chosenSizes = start.newTask.sizes;
    const migrated = migrator(start);
    expect(migrated.newTask.chosenSizes).toBe(start.newTask.sizes);
    expect(migrated).toEqual(start);
  });

  it('should add chosenSizes to all current tasks if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    migrated.tasks.map(updateTask);
    migrated.tasks.forEach(t => expect(t.chosenSizes).toBe(t.sizes));
    expect(migrated).toEqual(initialState);
  });

  it('should not modify chosenSizes for current tasks if it is present', () => {
    const start = { ...initialState };
    start.tasks.map(updateTask);
    const migrated = migrator(start);
    migrated.tasks.forEach(t => expect(t.chosenSizes).toBe(t.sizes));
    expect(migrated).toEqual(start);
  });

  it('should add chosenSizes sizes to selectedTask if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    expect(migrated.selectedTask.chosenSizes).toBe(migrated.selectedTask.sizes);
    expect(migrated).toEqual(initialState);
  });

  it('should not modify chosenSizes to selectedTask if it is present', () => {
    const start = { ...initialState };
    start.selectedTask.chosenSizes = start.selectedTask.sizes;
    const migrated = migrator(start);
    expect(migrated.selectedTask.chosenSizes).toBe(start.selectedTask.sizes);
    expect(migrated).toEqual(start);
  });
});
