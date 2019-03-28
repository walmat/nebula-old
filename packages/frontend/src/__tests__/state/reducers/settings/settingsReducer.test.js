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

    describe('discord settings action', () => {
      test('should save field edit', () => {
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

      test('should update webhook when window.Bridge is defined', () => {
        const Bridge = {
          updateHook: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const expected = {
          ...initialSettingsStates.settings,
          discord: 'test',
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DISCORD,
          value: 'test',
        });
        expect(actual).toEqual(expected);
        expect(Bridge.updateHook).toHaveBeenCalled();
        delete global.window.Bridge;
      });

      test('should not update webhook when window.Bridge is undefined', () => {
        const Bridge = {
          updateHook: jest.fn(),
        };
        const expected = {
          ...initialSettingsStates.settings,
          discord: 'test',
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DISCORD,
          value: 'test',
        });
        expect(actual).toEqual(expected);
        expect(Bridge.updateHook).not.toHaveBeenCalled();
      });
    });

    describe('slack settings action', () => {
      test('should save field edit', () => {
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

      test('should update webhook when window.Bridge is defined', () => {
        const Bridge = {
          updateHook: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const expected = {
          ...initialSettingsStates.settings,
          slack: 'test',
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SLACK,
          value: 'test',
        });
        expect(actual).toEqual(expected);
        expect(Bridge.updateHook).toHaveBeenCalled();
        delete global.window.Bridge;
      });

      test('should not update webhook when window.Bridge is undefined', () => {
        const Bridge = {
          updateHook: jest.fn(),
        };
        const expected = {
          ...initialSettingsStates.settings,
          slack: 'test',
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SLACK,
          value: 'test',
        });
        expect(actual).toEqual(expected);
        expect(Bridge.updateHook).not.toHaveBeenCalled();
      });
    });

    describe('monitor delay action', () => {
      test('when value is numerical non-null', () => {
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

      test('when value is empty', () => {
        const expected = {
          ...initialSettingsStates.settings,
          monitorDelay: 0,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: '',
        });
        expect(actual).toEqual(expected);
      });

      test('when value is null', () => {
        const expected = {
          ...initialSettingsStates.settings,
          monitorDelay: 0,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: null,
        });
        expect(actual).toEqual(expected);
      });

      test('when value is non-numerical', () => {
        const expected = {
          ...initialSettingsStates.settings,
          monitorDelay: 1500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('when window.Bridge is defined', () => {
        const Bridge = {
          changeDelay: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const expected = {
          ...initialSettingsStates.settings,
          monitorDelay: 2500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: 2500,
        });
        expect(actual).toEqual(expected);
        expect(Bridge.changeDelay).toHaveBeenCalled();
        delete global.window.Bridge;
      });

      test('when window.Bridge is undefined', () => {
        const Bridge = {
          changeDelay: jest.fn(),
        };
        const expected = {
          ...initialSettingsStates.settings,
          monitorDelay: 2500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: 2500,
        });
        expect(actual).toEqual(expected);
        expect(Bridge.changeDelay).not.toHaveBeenCalled();
      });
    });

    describe('error delay action', () => {
      test('when value is numerical non-null', () => {
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

      test('when value is empty', () => {
        const expected = {
          ...initialSettingsStates.settings,
          errorDelay: 0,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: '',
        });
        expect(actual).toEqual(expected);
      });

      test('when value is null', () => {
        const expected = {
          ...initialSettingsStates.settings,
          errorDelay: 0,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: null,
        });
        expect(actual).toEqual(expected);
      });

      test('when value is non-numerical', () => {
        const expected = {
          ...initialSettingsStates.settings,
          errorDelay: 1500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('when window.Bridge is defined', () => {
        const Bridge = {
          changeDelay: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const expected = {
          ...initialSettingsStates.settings,
          errorDelay: 2500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: 2500,
        });
        expect(actual).toEqual(expected);
        expect(Bridge.changeDelay).toHaveBeenCalled();
        delete global.window.Bridge;
      });

      test('when window.Bridge is undefined', () => {
        const Bridge = {
          changeDelay: jest.fn(),
        };
        const expected = {
          ...initialSettingsStates.settings,
          errorDelay: 2500,
        };
        const actual = settingsReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: 2500,
        });
        expect(actual).toEqual(expected);
        expect(Bridge.changeDelay).not.toHaveBeenCalled();
      });
    });

    describe('should respond to test webhook action', () => {
      describe('discord', () => {
        test('when window.Bridge is defined', () => {
          const Bridge = {
            sendWebhookTestMessage: jest.fn(),
          };
          global.window.Bridge = Bridge;
          settingsReducer(undefined, {
            type: SETTINGS_ACTIONS.TEST,
            hook: 'test',
            test_hook_type: 'discord',
          });
          expect(Bridge.sendWebhookTestMessage).toHaveBeenCalled();
          delete global.window.Bridge;
        });

        test('when window.Bridge is undefined', () => {
          const Bridge = {
            sendWebhookTestMessage: jest.fn(),
          };
          settingsReducer(undefined, {
            type: SETTINGS_ACTIONS.TEST,
            hook: 'test',
            test_hook_type: 'discord',
          });
          expect(Bridge.sendWebhookTestMessage).not.toHaveBeenCalled();
        });
      });

      describe('slack', () => {
        test('when window.Bridge is defined', () => {
          const Bridge = {
            sendWebhookTestMessage: jest.fn(),
          };
          global.window.Bridge = Bridge;
          settingsReducer(undefined, {
            type: SETTINGS_ACTIONS.TEST,
            hook: 'test',
            test_hook_type: 'slack',
          });
          expect(Bridge.sendWebhookTestMessage).toHaveBeenCalled();
          delete global.window.Bridge;
        });

        test('when window.Bridge is undefined', () => {
          const Bridge = {
            sendWebhookTestMessage: jest.fn(),
          };
          settingsReducer(undefined, {
            type: SETTINGS_ACTIONS.TEST,
            hook: 'test',
            test_hook_type: 'slack',
          });
          expect(Bridge.sendWebhookTestMessage).not.toHaveBeenCalled();
        });
      });
    });

    test('should handle clear shipping action', () => {
      const start = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          profile: {
            ...initialSettingsStates.shipping.profile,
            profileName: 'test',
          },
        },
      };
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          profile: {
            ...initialSettingsStates.shipping.profile,
          },
        },
      };
      const actual = settingsReducer(start, {
        type: SETTINGS_ACTIONS.CLEAR_SHIPPING,
      });
      expect(actual).toEqual(expected);
    });

    test('should handle error action', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          profile: {
            ...initialSettingsStates.shipping.profile,
          },
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.ERROR,
        action: 'test',
        error: 'test',
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

    test('shipping product', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: '+test',
          },
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: '+test',
      });
      expect(actual).toEqual(expected);
    });

    test('shipping rate name', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          name: 'test',
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    test('shipping profile', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          profile: {
            ...initialSettingsStates.shipping.profile,
            id: 1,
            profileName: 'test',
          },
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
        value: {
          ...initialSettingsStates.shipping.profile,
          id: 1,
          profileName: 'test',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('shipping site', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          site: {
            name: 'Nebula Bots',
            url: 'https://nebulabots.com',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            localCheckout: false,
            special: false,
            auth: false,
          },
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
        value: {
          name: 'Nebula Bots',
          url: 'https://nebulabots.com',
          apiKey: '6526a5b5393b6316a64853cfe091841c',
          auth: false,
          localCheckout: false,
          special: false,
        },
      });
      expect(actual).toEqual(expected);
    });

    test('shipping username', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          username: 'test',
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    test('shipping password', () => {
      const expected = {
        ...initialSettingsStates.settings,
        shipping: {
          ...initialSettingsStates.shipping,
          password: 'test',
        },
      };
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: 'test',
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

  describe('should handle fetch shipping action', () => {
    test('when action has errors', () => {
      const expected = initialSettingsStates.settings;
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {},
        errors: {},
      });
      expect(actual).toEqual(expected);
    });

    test('when action has no errors but no response', () => {
      const expected = initialSettingsStates.settings;
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
      });
      expect(actual).toEqual(expected);
    });

    test('when action has no errors, response, rates, but no selectedRate', () => {
      const expected = initialSettingsStates.settings;
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          rates: [],
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when action has no errors, response, selectedRate, but no rates (somehow?)', () => {
      const expected = initialSettingsStates.settings;
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          selectedRate: [],
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when action has no errors, response, selectedRate, and rates', () => {
      // TODO: once we implement shipping rates reducer chain logic..
      const expected = initialSettingsStates.settings;
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          rates: [],
          selectedRate: {},
        },
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle setup shipping action', () => {
    test('when status is already in progress', () => {
      const start = { ...initialSettingsStates.settings };
      start.shipping.status = 'inprogress';
      const actual = settingsReducer(start, {
        type: SETTINGS_ACTIONS.SETUP_SHIPPING,
      });
      expect(actual).toEqual(start);
    });

    test('when status is idle', () => {
      const expected = { ...initialSettingsStates.settings };
      expected.shipping.status = 'inprogress';
      const actual = settingsReducer(undefined, {
        type: SETTINGS_ACTIONS.SETUP_SHIPPING,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle cleanup shipping action', () => {
    test('when status is already idle', () => {
      const start = { ...initialSettingsStates.settings };
      start.shipping.status = 'idle';
      const actual = settingsReducer(start, {
        type: SETTINGS_ACTIONS.CLEANUP_SHIPPING,
        status: true,
      });
      expect(actual).toEqual(start);
    });

    test('when status is in progress', () => {
      const start = { ...initialSettingsStates.settings };
      start.shipping.status = 'inprogress';
      const actual = settingsReducer(start, {
        type: SETTINGS_ACTIONS.CLEANUP_SHIPPING,
        status: true,
      });
      start.shipping.status = 'idle';
      expect(actual).toEqual(start);
    });
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
