/* global describe expect it test jest beforeEach */
import taskAttributeValidationMiddleware from '../../../../state/middleware/tasks/tasksAttributeValidationMiddleware';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../../../state/actions';
import { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';

describe('task attribute validation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };

    const next = jest.fn();

    const invoke = action => taskAttributeValidationMiddleware(store)(next)(action);

    return {
      store,
      next,
      invoke,
    };
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

  it('should pass through actions that aren\'t a task edit type', () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_TASK_EDIT_ACTION' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should pass through edit actions that are malformed due to', () => {
    const getAction = payload => ({
      type: TASK_ACTIONS.EDIT,
      id: null,
      ...payload,
    });

    const testNoop = (payload) => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        newTask: {
          ...initialTaskStates.task,
          id: null,
        },
      }));
      const action = getAction(payload);
      invoke(action);
      expect(next).not.toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      const nextAction = store.dispatch.mock.calls[0][0];
      expect(nextAction.action).toBe(TASK_ACTIONS.EDIT);
      expect(nextAction.type).toBe(TASK_ACTIONS.ERROR);
    };

    test('null field given', () => testNoop({
      field: null,
      value: 'test',
    }));

    test('no field given', () => testNoop({
      value: 'test',
    }));

    test('null value given', () => testNoop({
      field: TASK_FIELDS.EDIT_PRODUCT,
      value: null,
    }));

    test('no value given', () => testNoop({}));
  });

  const performErrorInjectionTest = ({ id, action, expectedAction }) => {
    const { store, next, invoke } = create();
    store.getState = jest.fn(() => ({
      newTask: {
        ...initialTaskStates.task,
        id: '',
      },
      tasks: [{
        ...initialTaskStates.task,
        id,
      }],
    }));
    invoke(action);
    expect(next).toHaveBeenCalledWith(expectedAction);
  };

  const generateActions = (id, field, value, valid) => ({
    id,
    action: {
      type: TASK_ACTIONS.EDIT,
      id,
      field,
      value,
    },
    expectedAction: {
      type: TASK_ACTIONS.EDIT,
      id,
      field,
      value,
      errors: {
        [mapTaskFieldsToKey[field]]: !valid,
      },
    },
  });

  const testAllFields = (id) => {
    const testInjection = actionObject => performErrorInjectionTest(actionObject);
    const getActions = (field, value, valid) => generateActions(id, field, value, valid);


    describe('should inject errors map on', () => {
      describe('edit product field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PRODUCT, '+test', true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PRODUCT, '', false));
        });
      });

      describe('edit site field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_SITE, {
            url: 'https://amongstfew.com',
            name: 'Amongst Few',
            supported: true,
            auth: false,
          }, true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_SITE, '', false));
        });
      });

      describe('edit profile field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PROFILE, {
            id: '1',
            profileName: 'test',
            billingMatchesShipping: false,
            payment: {
              email: 'test@me.com',
              cardNumber: '4111111111111',
              exp: '12/34',
              cvv: '123',
            },
            billing: {
              firstName: 'test',
              lastName: 'test',
              address: 'test',
              apt: 'test',
              city: 'test',
              state: { label: 'Puerto Rico', value: 'PR' },
              country: { value: 'US', label: 'United States' },
              zipCode: '12345',
              phone: '1234567890',
            },
            shipping: {
              firstName: 'test',
              lastName: 'test',
              address: 'test',
              apt: 'test',
              city: 'test',
              state: { label: 'Puerto Rico', value: 'PR' },
              country: { value: 'US', label: 'United States' },
              zipCode: '12345',
              phone: '1234567890',
            },
          }, true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PROFILE, '', false));
        });
      });

      describe('edit sizes field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_SIZES, ['XXS'], true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_SIZES, [], false));
        });
      });

      describe('edit username field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_USERNAME, 'test', true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_USERNAME, '', false));
        });
      });

      describe('edit password field', () => {
        test('when valid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PASSWORD, 'test', true));
        });

        test('when invalid', () => {
          testInjection(getActions(TASK_FIELDS.EDIT_PASSWORD, '', false));
        });
      });
    });
  };

  describe('for new task', () => {
    testAllFields(null);
  });

  describe('for existing task', () => {
    testAllFields(1);
  });
});
