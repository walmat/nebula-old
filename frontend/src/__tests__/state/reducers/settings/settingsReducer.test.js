/* global describe it test expect beforeAll */
import settingsReducer from '../../../../state/reducers/settings/settingsReducer';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import { initialSettingsStates } from '../../../../utils/definitions/settingsDefinitions';

describe('settings reducer', () => {
  it('should return initial state', () => {
    const expected = initialSettingsStates.settings;
    const actual = settingsReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  describe('should handle edit', () => {
    test('proxies settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        proxies: [initialSettingsStates.proxy],
      };
      const actual = settingsReducer(
        undefined,
        {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_PROXIES,
          value: [initialSettingsStates.proxy],
        },
      );
      expect(actual).toEqual(expected);
    });

    test('discord settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        discord: 'discord_test',
      };
      const actual = settingsReducer(
        undefined,
        {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DISCORD,
          value: 'discord_test',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('slack settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        slack: 'slack',
      };
      const actual = settingsReducer(
        undefined,
        {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SLACK,
          value: 'slack',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('default profile settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        defaults: {
          ...initialSettingsStates.defaults,
          profile: { profileName: 'test' },
        },
      };
      const actual = settingsReducer(
        undefined,
        {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
          value: { profileName: 'test' },
        },
      );
      expect(actual).toEqual(expected);
    });

    test('default sizes settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        defaults: {
          ...initialSettingsStates.defaults,
          sizes: [{ value: 'test', label: 'test_label' }],
        },
      };
      const actual = settingsReducer(
        undefined,
        {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
          value: [{ value: 'test', label: 'test_label' }],
        },
      );
      expect(actual).toEqual(expected);
    });
  });

  it('should handle save defaults action', () => {
    const expected = {
      ...initialSettingsStates.settings,
      defaults: {
        ...initialSettingsStates.defaults,
        profile: { profileName: 'testing' },
        sizes: [1, 2, 3],
      },
    };
    const actual = settingsReducer(
      undefined,
      {
        type: SETTINGS_ACTIONS.SAVE,
        defaults: {
          profile: { profileName: 'testing' },
          sizes: [1, 2, 3],
        },
      },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle clear defaults action', () => {
    const start = {
      ...initialSettingsStates.settings,
      defaults: {
        ...initialSettingsStates.defaults,
        profile: {},
        sizes: [1, 2, 3],
      },
    };
    const expected = initialSettingsStates.settings;
    const actual = settingsReducer(start, { type: SETTINGS_ACTIONS.CLEAR });
    expect(actual).toEqual(expected);
    expect(actual).not.toEqual(start);
  });

  describe('should add errors to state from', () => {
    let expected;

    const _getStateForAction = actionType => settingsReducer(undefined, { type: actionType, defaults: initialSettingsStates.defaults, errors: 'testing' });

    beforeAll(() => {
      expected = {
        ...initialSettingsStates.settings,
        errors: 'testing',
      };
    });

    test('edit action', () => {
      const actual = _getStateForAction(SETTINGS_ACTIONS.EDIT);
      expect(actual).toEqual(expected);
    });

    test('save action', () => {
      const actual = _getStateForAction(SETTINGS_ACTIONS.SAVE);
      expect(actual).toEqual(expected);
    });

    test('clear action', () => {
      const actual = _getStateForAction(SETTINGS_ACTIONS.CLEAR);
      expect(actual).toEqual(expected);
    });
  });
});
