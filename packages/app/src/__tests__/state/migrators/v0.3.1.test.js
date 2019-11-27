/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.3.1';
import initialState from '../../../state/migrators/v0.3.1/state';
import prevState from '../../../state/migrators/v0.3.0/state';

describe('v0.3.1 migrator', () => {
  const updateTask = task => ({
    ...task,
    product: {
      ...task.product,
      found: task.product.found || null,
    },
    proxy: task.proxy || null,
    log: task.log || [],
  });

  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should update lower versions', () => {
    const start = {
      ...initialState,
      version: '0.3.0',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(initialState);
  });

  it('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.3.2',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  it('should add found to product, proxy, and log to new tasks if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    expect(migrated.newTask).toEqual({
      ...start.newTask,
      product: {
        ...start.newTask.product,
        found: null,
      },
      proxy: null,
      log: [],
    });
    expect(migrated).toEqual(initialState);
  });

  it('should not modify found product, proxy, and log to new tasks if it is present', () => {
    const start = { ...initialState };
    start.newTask = {
      ...start.newTask,
      product: {
        ...start.newTask.product,
        found: 'Test product',
      },
      proxy: '127.0.0.1:8700',
      log: ['test', 'test'],
    };
    const migrated = migrator(start);
    expect(migrated.newTask).toEqual(start.newTask);
    expect(migrated).toEqual(start);
  });

  it('should add found to product, proxy, and log to current tasks if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    migrated.tasks.map(updateTask);
    migrated.tasks.forEach(t =>
      expect(t).toEqual({
        ...start.newTask,
        product: {
          ...start.newTask.product,
          found: null,
        },
        proxy: null,
        log: [],
      }),
    );
    expect(migrated).toEqual(initialState);
  });

  it('should not modify found product, proxy, and log to current tasks if it is present', () => {
    const start = {
      ...initialState,
      tasks: [
        {
          ...initialState.newTask,
          id: 1,
          product: {
            ...initialState.newTask.product,
            found: 'test',
          },
          proxy: '127.0.0.1:8700',
          log: ['test', 'test'],
        },
      ],
    };
    start.tasks.map(updateTask);
    const migrated = migrator(start);
    migrated.tasks.forEach(t =>
      expect(t).toEqual({
        ...start.newTask,
        id: 1,
        product: {
          ...start.newTask.product,
          found: 'test',
        },
        proxy: '127.0.0.1:8700',
        log: ['test', 'test'],
      }),
    );
    expect(migrated).toEqual(start);
  });

  it('should add found to product, proxy, and log to selected task if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    expect(migrated.selectedTask).toEqual({
      ...start.selectedTask,
      product: {
        ...start.selectedTask.product,
        found: null,
      },
      proxy: null,
      log: [],
    });
    expect(migrated).toEqual(initialState);
  });

  it('should not modify found product, proxy, and log to selected task if it is present', () => {
    const start = { ...initialState };
    start.selectedTask = {
      ...start.selectedTask,
      product: {
        ...start.selectedTask.product,
        found: 'Test product',
      },
      proxy: '127.0.0.1:8700',
      log: ['test', 'test'],
    };
    const migrated = migrator(start);
    expect(migrated.selectedTask).toEqual(start.selectedTask);
    expect(migrated).toEqual(start);
  });
});
