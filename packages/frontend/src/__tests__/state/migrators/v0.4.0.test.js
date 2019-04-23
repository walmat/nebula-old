/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.4.0';
import initialState from '../../../state/migrators/v0.4.0/state';
import prevState from '../../../state/migrators/v0.3.1/state';

describe('v0.4.0 migrator', () => {
  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should update lower versions', () => {
    const start = {
      ...initialState,
      version: '0.3.1',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(initialState);
  });

  it('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.4.1',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  it('should not filter tasks that have valid ids', () => {
    const start = {
      ...prevState,
      tasks: [
        {
          ...prevState.newTask,
          id: 1,
          index: 1,
        },
        {
          ...prevState.newTask,
          id: 2,
          index: 2,
        },
        {
          ...prevState.newTask,
          id: 3,
          index: 3,
        },
      ],
    };
    const migrated = migrator(start);
    expect(migrated).toEqual({
      ...start,
      version: '0.4.0',
      tasks: [
        {
          ...prevState.newTask,
          id: 1,
          index: 1,
        },
        {
          ...prevState.newTask,
          id: 2,
          index: 2,
        },
        {
          ...prevState.newTask,
          id: 3,
          index: 3,
        },
      ],
    });
  });

  it('should not filter tasks that have valid ids', () => {
    const start = {
      ...prevState,
      tasks: [
        {
          ...prevState.newTask,
          id: 1,
          index: 1,
        },
        {
          ...prevState.newTask,
          id: 2,
          index: '2-2',
        },
        {
          ...prevState.newTask,
          id: 3,
          index: '3-3',
        },
      ],
    };
    const migrated = migrator(start);
    expect(migrated).toEqual({
      ...start,
      version: '0.4.0',
      tasks: [
        {
          ...prevState.newTask,
          id: 1,
          index: 1,
        },
      ],
    });
  });
});
