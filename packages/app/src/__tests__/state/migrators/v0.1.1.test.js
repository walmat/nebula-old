/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.1.1';
import initialState from '../../../state/migrators/v0.1.1/state';
import prevState from '../../../state/migrators/v0.1.0/state';

describe('v0.1.1 migrator', () => {
  const addCountry = (location, def) => ({
    ...location,
    country: def
      ? { value: 'US', label: 'United States' }
      : { value: 'UK', label: 'United Kingdom' },
    errors: {
      ...location.errors,
      country: !def,
    },
  });

  const updateProfile = ({ billing, shipping, ...rest }, def) => ({
    ...rest,
    billing: addCountry(billing, def),
    shipping: addCountry(shipping, def),
  });

  const updateTask = ({ profile, edits, ...rest }, def) => ({
    ...rest,
    profile: updateProfile(profile, def),
    edits: {
      ...edits,
      profile: edits.profile ? updateProfile(edits.profile, def) : edits.profile,
    },
  });

  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should update lower versions', () => {
    const start = {
      ...initialState,
      version: '0.1.0',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(initialState);
  });

  it('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.2.0',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  it('should add default country to profiles if they were not previously present', () => {
    const editedTask = {
      ...prevState.newTask,
      edits: {
        ...prevState.newTask.edits,
        profile: prevState.currentProfile,
      },
    };
    const start = {
      ...prevState,
      profiles: [prevState.currentProfile],
      tasks: [editedTask],
    };
    const expected = {
      ...initialState,
      profiles: [initialState.currentProfile],
      tasks: [updateTask(editedTask, true)],
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(expected);
  });

  it('should not change country on profiles if they have a non-default one already', () => {
    const start = {
      ...initialState,
      profiles: [initialState.currentProfile].map(p => updateProfile(p, false)),
      currentProfile: updateProfile(initialState.currentProfile, false),
      selectedProfile: updateProfile(initialState.selectedProfile, false),
      tasks: [initialState.newTask].map(updateTask, false),
      newTask: updateTask(initialState.newTask, false),
      selectedTask: updateTask(initialState.selectedTask, false),
      settings: {
        ...initialState.settings,
        defaults: {
          ...initialState.settings.defaults,
          profile: updateProfile(initialState.settings.defaults.profile, false),
          edits: {
            ...initialState.settings.defaults.edits,
            profile: updateProfile(initialState.settings.defaults.edits.profile, false),
          },
        },
      },
    };
    const migrated = migrator(start);
    expect(migrated).not.toEqual(initialState);
    expect(migrated).toEqual(start);
  });
});
