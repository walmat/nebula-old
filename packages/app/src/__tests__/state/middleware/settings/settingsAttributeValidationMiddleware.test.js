/* global describe expect it test jest */
import settingsAttributeValidationMiddleware from '../../../../state/middleware/settings/settingsAttributeValidationMiddleware';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import initialSettingsStates from '../../../../state/initial/settings';

describe('settings attribute validatation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action => settingsAttributeValidationMiddleware(store)(next)(action);

    return { store, next, invoke };
  };

  it('should pass through thunks', () => {
    const { next, invoke } = create();
    const thunk = jest.fn();
    invoke(thunk);
    expect(thunk).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(thunk);
  });

  it('should pass through actions without type', () => {
    const { store, next, invoke } = create();
    const action = {};
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
  });

  it("should pass through actions that aren't a settings edit type", () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_SETTINGS_ACTION' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should pass through actions that edit field', () => {
    test('proxies', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_PROXIES };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('error delay', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_ERROR_DELAY };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('monitor delay', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('default profile', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('default sizes', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping product', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping rate name', () => {
      const { store, next, invoke } = create();
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping profile', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping site', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping username', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('shipping password', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });
  });

  it('should not respond to invalid fields', () => {
    const { store, next, invoke } = create();
    const action = {
      type: SETTINGS_ACTIONS.EDIT,
      field: 'INVALID_FIELD',
    };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('for edit discord', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settingsErrors,
        discord: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_DISCORD,
        value:
          'https://discordapp.com/api/webhooks/492205269942796298/H0giZl0oansmwORuW4ifx-fwKWbcVPXR23FMoWkgrBfIqQErIKBiNQznQIHQuj-EPXic',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.discord).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_DISCORD,
        value: 'invalid',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settingsErrors,
          discord: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('for edit slack', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settingsErrors,
        slack: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'https://hooks.slack.com/services/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',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.slack).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'invalid',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settingsErrors,
          slack: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });
});
