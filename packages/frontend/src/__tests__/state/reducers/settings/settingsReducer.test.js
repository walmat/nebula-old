/* global describe it test expect beforeAll */
import settingsReducer from '../../../../state/reducers/settings/settingsReducer';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import initialSettingsStates from '../../../../state/initial/settings';

describe('settings reducer', () => {
  it('should return initial state', () => {
    const expected = initialSettingsStates.settings;
    const actual = settingsReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  describe('should handle edit', () => {
    describe('proxies setting action', () => {
      test('when no existing proxies exist', () => {
        const expected = {
          ...initialSettingsStates.settings,
          proxies: [initialSettingsStates.proxy],
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_PROXIES,
          value: [initialSettingsStates.proxy],
          errors: {},
        });
        expect(actual).toEqual(expected);
      });

      test('when no valid proxies exist', () => {
        const initial = {
          ...initialSettingsStates.settings,
          proxies: ['test'],
          errors: {
            ...initialSettingsStates.settingsErrors,
            proxies: [0],
          },
        };
        const expected = {
          ...initial,
          proxies: ['test', '192.168.0.1:8080'],
          errors: {
            ...initial.errors,
          },
        };
        const actual = settingsReducer(initial, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_PROXIES,
          value: ['test', '192.168.0.1:8080'],
          errors: {
            ...initialSettingsStates.settingsErrors,
            proxies: [0],
          },
        });
        expect(actual).toEqual(expected);
      });

      describe('when valid proxies exist', () => {
        test('when no valid incoming proxies exist', () => {
          const initial = {
            ...initialSettingsStates.settings,
            proxies: ['255.255.255.255:80'],
            errors: {
              ...initialSettingsStates.settingsErrors,
              proxies: [],
            },
          };
          const expected = {
            ...initial,
            proxies: ['255.255.255.255:80', 'test'],
            errors: {
              ...initialSettingsStates.settingsErrors,
              proxies: [1],
            },
          };
          const actual = settingsReducer(initial, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_PROXIES,
            value: ['255.255.255.255:80', 'test'],
            errors: {
              ...initialSettingsStates.settingsErrors,
              proxies: [1],
            },
          });
          expect(actual).toEqual(expected);
        });

        describe('when valid incoming proxies exist', () => {
          test('when there is no removal', () => {
            const initial = {
              ...initialSettingsStates.settings,
              proxies: ['255.255.255.255:80'],
              errors: {
                ...initialSettingsStates.settingsErrors,
                proxies: [],
              },
            };
            const expected = {
              ...initial,
              proxies: ['255.255.255.255:80', '255.255.255.255:90'],
              errors: {
                ...initialSettingsStates.settingsErrors,
                proxies: [],
              },
            };
            const actual = settingsReducer(initial, {
              type: SETTINGS_ACTIONS.EDIT,
              field: SETTINGS_FIELDS.EDIT_PROXIES,
              value: ['255.255.255.255:80', '255.255.255.255:90'],
              errors: {
                ...initialSettingsStates.settingsErrors,
                proxies: [],
              },
            });
            expect(actual).toEqual(expected);
          });

          describe('when there is removal', () => {
            let initial;
            let expected;
            beforeEach(() => {
              initial = {
                ...initialSettingsStates.settings,
                proxies: ['255.255.255.255:80', 'invalid'],
                errors: {
                  ...initialSettingsStates.settingsErrors,
                  proxies: [1],
                },
              };
              expected = {
                ...initial,
                proxies: ['255.255.255.255:90'],
                errors: {
                  ...initialSettingsStates.settingsErrors,
                  proxies: [],
                },
              };
            });

            test("and window bridge methods don't exist", () => {
              const actual = settingsReducer(initial, {
                type: SETTINGS_ACTIONS.EDIT,
                field: SETTINGS_FIELDS.EDIT_PROXIES,
                value: ['255.255.255.255:90'],
                errors: {
                  ...initialSettingsStates.settingsErrors,
                  proxies: [],
                },
              });
              expect(actual).toEqual(expected);
            });

            test('and window bridge methods exist', () => {
              const Bridge = {
                removeProxies: jest.fn(),
              };
              global.window.Bridge = Bridge;
              const actual = settingsReducer(initial, {
                type: SETTINGS_ACTIONS.EDIT,
                field: SETTINGS_FIELDS.EDIT_PROXIES,
                value: ['255.255.255.255:90'],
                errors: {
                  ...initialSettingsStates.settingsErrors,
                  proxies: [],
                },
              });
              expect(actual).toEqual(expected);
              expect(Bridge.removeProxies).toHaveBeenCalledWith(['255.255.255.255:80']);
              delete global.window.Bridge;
            });
          });
        });
      });
    });

    test('discord settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        discord: 'discord_test',
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_DISCORD,
        value: 'discord_test',
      });
      expect(actual).toEqual(expected);
    });

    test('slack settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        slack: 'slack',
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'slack',
      });
      expect(actual).toEqual(expected);
    });

    test('monitor delay action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        monitorDelay: 1500,
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
        value: '1500',
      });
      expect(actual).toEqual(expected);
    });

    test('error delay action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        errorDelay: 1500,
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
        value: '1500',
      });
      expect(actual).toEqual(expected);
    });

    test('default profile settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        defaults: {
          ...initialSettingsStates.defaults,
          profile: {
            ...initialSettingsStates.defaults.profile,
            profileName: 'test',
          },
          useProfile: true,
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
        value: {
          ...initialSettingsStates.defaults.profile,
          profileName: 'test',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('default sizes settings action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        defaults: {
          ...initialSettingsStates.defaults,
          sizes: ['4'],
          useSizes: true,
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
        value: ['4'],
      });
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
    const actual = settingsReducer(undefined, {
      type: SETTINGS_ACTIONS.SAVE,
      defaults: {
        profile: { profileName: 'testing' },
        sizes: [1, 2, 3],
      },
    });
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
    const actual = settingsReducer(start, { type: SETTINGS_ACTIONS.CLEAR_DEFAULTS });
    expect(actual).toEqual(expected);
    expect(actual).not.toEqual(start);
  });

  describe('should add errors to state from', () => {
    let expected;

    const _getStateForAction = actionType =>
      settingsReducer(undefined, {
        type: actionType,
        defaults: initialSettingsStates.defaults,
        errors: initialSettingsStates.settingsErrors,
      });

    beforeAll(() => {
      expected = {
        ...initialSettingsStates.settings,
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
