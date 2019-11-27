import migrator from '../../../state/migrators/v0.2.0';
import initialState from '../../../state/migrators/v0.2.0/state';
import prevState from '../../../state/migrators/v0.1.1/state';

describe('v0.2.0 migrator', () => {
  const initialShippingRatesState = [];

  const initialShippingManagerErrorState = {
    profile: null,
    name: null,
    site: null,
    product: null,
    username: null,
    password: null,
  };

  const addShippingRatesToProfile = {
    ...prevState.currentProfile,
    rates: initialShippingRatesState,
    selectedSite: null,
  };

  const initialShippingManagerState = {
    name: '',
    profile: addShippingRatesToProfile,
    site: {
      name: null,
      url: null,
      supported: null,
      apiKey: null,
      auth: null,
    },
    product: {
      raw: '',
      variant: null,
      pos_keywords: null,
      neg_keywords: null,
      url: null,
    },
    username: '',
    password: '',
    errors: initialShippingManagerErrorState,
  };

  const updateTask = ({ profile, edits, ...rest }) => ({
    ...rest,
    profile: addShippingRatesToProfile,
    edits: {
      ...edits,
      profile: edits.profile ? addShippingRatesToProfile : edits.profile,
    },
  });

  test('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  test('should update lower versions', () => {
    const initial = {
      ...initialState,
      version: '0.1.1',
    };
    const migrated = migrator(initial);
    expect(migrated).toEqual(initialState);
  });

  test('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.2.1',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  test('should add shipping rates, selected site, and initial state for shipping manager', () => {
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
      profiles: [addShippingRatesToProfile],
      currentProfile: addShippingRatesToProfile,
      selectedProfile: addShippingRatesToProfile,
      tasks: [updateTask(editedTask)],
      newTask: updateTask(initialState.newTask),
      selectedTask: updateTask(initialState.selectedTask),
      settings: {
        ...initialState.settings,
        shipping: {
          ...initialShippingManagerState,
        },
        defaults: {
          ...initialState.settings.defaults,
          profile: addShippingRatesToProfile,
          edits: {
            ...initialState.settings.defaults.edits,
            profile: addShippingRatesToProfile,
          },
        },
      },
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(expected);
  });
});
