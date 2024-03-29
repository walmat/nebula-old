/* global describe expect it test jest */
import shippingFormAttributeValidationMiddleware from '../../../../state/middleware/settings/shippingFormAttributeValidationMiddleware';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import initialSettingsStates from '../../../../state/initial/settings';
import initialProfileStates from '../../../../state/initial/profiles';

describe('settings attribute validatation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action => shippingFormAttributeValidationMiddleware(store)(next)(action);

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

    test('discord', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_DISCORD };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).not.toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors).not.toBeDefined();
    });

    test('slack', () => {
      const { store, next, invoke } = create();
      const action = { type: SETTINGS_ACTIONS.EDIT, field: SETTINGS_FIELDS.EDIT_SLACK };
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

  describe('shipping form product', () => {
    it('should not pass an errors object if input is valid keywords', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        product: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: '+test',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.product).toEqual(false);
    });

    it('should not pass an errors object if input is an object and valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        product: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: {
          raw: '+test',
        },
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.product).toEqual(false);
    });

    it('should not pass an errors object if input is a valid variant', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        product: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: 1234123141241,
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.product).toEqual(false);
    });

    it('should not pass an errors object if input is a valid url', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        product: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: 'https://example.com',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.product).toEqual(false);
    });

    it('should pass an errors object if input is undefined', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: undefined,
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          product: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });

    it('should pass an errors object if input is not valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: 'test',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          product: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('shipping form rate name', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        name: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
        value: 'test name',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.name).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
        value: '',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          name: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('shipping form profile', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        profile: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
        value: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.profile).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
        value: 'invalid',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          profile: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('shipping form site', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        site: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
        value: {
          name: 'Kith',
          url: 'https://kith.com',
          apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
          auth: false,
          supported: true,
        },
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.site).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
        value: 'invalid',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          site: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('shipping form username', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        username: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
        value: 'test',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.username).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
        value: '',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          site: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('shipping form password', () => {
    it('should not pass an errors object if input is valid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const expectedErrors = {
        ...initialSettingsStates.settings.shipping.errors,
        password: false,
      };
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: 'test',
        errors: expectedErrors,
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(store.getState).toHaveBeenCalled();
      const nextAction = next.mock.calls[0][0];
      expect(nextAction.errors.password).toEqual(false);
    });

    it('should pass an errors object if input is invalid', () => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        settings: initialSettingsStates.settings,
      }));
      const action = {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: '',
      };
      const expectedAction = {
        ...action,
        errors: {
          ...initialSettingsStates.settings.shipping.errors,
          password: true,
        },
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(expectedAction);
      expect(store.getState).toHaveBeenCalled();
    });
  });
});
