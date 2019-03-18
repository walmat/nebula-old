/* global describe expect it test jest */
import proxyAttributeValidationMiddleware from '../../../../state/middleware/settings/proxyAttributeValidationMiddleware';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import initialSettingsStates from '../../../../state/initial/settings';

describe('proxy attribute validatation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action => proxyAttributeValidationMiddleware(store)(next)(action);

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

  describe('for edit proxies', () => {
    it('should not pass an errors object if proxies are valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = { ...initialSettingsStates.settingsErrors };
      delete expectedErrors.proxies;
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_PROXIES,
        value: ['123.123.123.123:8080', '123.123.123.123:8080:user:pass'],
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.proxies).not.toBeDefined();
    });

    it('should pass an errors object if some proxies are invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_PROXIES,
        value: [
          '123.123.123.123:8080',
          '123.123.123.123:8080:user:pass',
          'invalid',
          '123.123.123.123:8080:',
          '123.123.123.123:8080:user:',
          '123.123.123.123:8080:user:pass:invalid',
        ],
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settingsErrors,
          proxies: [2, 3, 4, 5],
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });
});
