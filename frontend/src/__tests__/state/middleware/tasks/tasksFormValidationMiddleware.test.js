/* global describe expect it test jest beforeEach */
import tasksFormValidationMiddleware from '../../../../state/middleware/tasks/tasksFormValidationMiddleware';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../../../state/actions';
import { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('task form validation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action => tasksFormValidationMiddleware(store)(next)(action);

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

  it('should pass through actions that aren\'t a task add or update type', () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_TASK_ADD_OR_UPDATE' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should dispatch errors for actions that are malformed', () => {
    const getAction = payload => ({
      id: null,
      ...payload,
    });

    const testNoop = (payload) => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        task: {
          id: null,
          ...initialTaskStates.task,
        },
      }));
      const action = getAction(payload);
      invoke(action);
      expect(next).not.toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      const nextAction = store.dispatch.mock.calls[0][0];
      expect(nextAction.action).toBe(payload.type);
      expect(nextAction.type).toBe(TASK_ACTIONS.ERROR);
    };

    describe('null task given', () => {
      test('when type is add', () => testNoop({
        type: TASK_ACTIONS.ADD,
        response: null,
      }));

      test('when type is update', () => testNoop({
        type: TASK_ACTIONS.UPDATE,
        id: null,
      }));
    });

    describe('no task given', () => {
      test('when type is add', () => testNoop({
        type: TASK_ACTIONS.ADD,
      }));

      test('when type is update', () => testNoop({
        type: TASK_ACTIONS.UPDATE,
      }));
    });
  });

  const generateActions = (type, field, value, testValid) => {
    const actionBase = {
      type,
      task: {
        ...initialTaskStates.task,
        product: testValid ? '' : {
          raw: '',
          variant: null,
          pos_keywords: null,
          neg_keywords: null,
          url: null,
        },
        site: testValid ? '' : {
          name: null,
          url: null,
          supported: null,
          auth: null,
        },
        profile: testValid ? '' : {
          ...initialProfileStates.profile,
          profileName: testValid ? '' : 'test',
          billingMatchesShipping: testValid ? undefined : false,
          payment: {
            ...initialProfileStates.payment,
            email: testValid ? 'invalid' : 'test@me.com',
            cardNumber: testValid ? 'invalid' : '4111111111111',
            exp: testValid ? 'invalid' : '12/34',
            cvv: testValid ? 'invalid' : '123',
          },
          billing: {
            ...initialProfileStates.location,
            firstName: testValid ? '' : 'test',
            lastName: testValid ? '' : 'test',
            address: testValid ? '' : 'test',
            apt: 'test',
            city: testValid ? '' : 'test',
            state: testValid ? 'invalid' : { label: 'Puerto Rico', value: 'PR' },
            country: testValid ? 'invalid' : { value: 'US', label: 'United States' },
            zipCode: testValid ? '' : '12345',
            phone: testValid ? 'invalid' : '1234567890',
          },
          shipping: {
            ...initialProfileStates.location,
            firstName: testValid ? '' : 'test',
            lastName: testValid ? '' : 'test',
            address: testValid ? '' : 'test',
            apt: 'test',
            city: testValid ? '' : 'test',
            state: testValid ? 'invalid' : { label: 'Puerto Rico', value: 'PR' },
            country: testValid ? 'invalid' : { value: 'US', label: 'United States' },
            zipCode: testValid ? '' : '12345',
            phone: testValid ? 'invalid' : '1234567890',
          },
        },
        sizes: testValid ? null : [],
        username: testValid ? '' : 'test',
        password: testValid ? '' : 'test',
        status: testValid ? '' : 'idle',
        output: testValid ? '' : 'Monitoring...',
        errorDelay: testValid ? '' : 1500,
        monitorDelay: testValid ? '' : 1500,
      },
    };
    const expectedActionBase = {
      ...actionBase,
      task: {
        ...actionBase.task,
        errors: {
          ...actionBase.task.errors,
        },
        product: {
          ...actionBase.task.product,
        },
        site: {
          ...actionBase.task.site,
        },
        sizes: [
          ...actionBase.task.sizes,
        ],
      },
      errors: {
        product: {
          raw: testValid,
          variant: testValid,
          pos_keywords: testValid,
          neg_keywords: testValid,
          url: testValid,
        },
        site: testValid,
        profile: testValid,
        sizes: testValid,
        username: testValid,
        password: testValid,
        status: testValid,
        errorDelay: testValid,
        monitorDelay: testValid,
      },
      edits: {
        ...actionBase.task.edits,
        errors: {
          ...actionBase.task.edits.errors,
        },
      },
    };
    const action = {
      ...actionBase,
      response: {
        ...actionBase.task,
        [mapTaskFieldsToKey[field]]: value,
      },
    };
    const expectedAction = {
      ...expectedActionBase,
      ...action,
      response: {
        ...actionBase.task,
        ...expectedActionBase.task,
        [mapTaskFieldsToKey[field]]: value,
      },
      errors: {
        ...expectedActionBase.errors,
        [mapTaskFieldsToKey[field]]: !testValid,
      },
    };
    expectedAction.task.errors = {
      ...expectedAction.task.errors,
      [mapTaskFieldsToKey[field]]: !testValid,
    };
    return {
      action,
      expectedAction,
    };
  };

  const testErrorFlagsForAction = (type, args, genNoErrors) => {
    // get args or mock them if we aren't generating errors
    const {
      field, value, valid,
    } = !genNoErrors ? args : {
      value: 'test', valid: false,
    };
    const { store, next, invoke } = create();
    const { action, expectedAction } = generateActions(
      type,
      field,
      value,
      valid,
    );
    if (genNoErrors) {
      // delete expected errors field if we aren't generating errors
      delete expectedAction.errors;
      delete expectedAction.task.errors.undefined;
    }
    invoke(action);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expectedAction);
  };

  const performErrorFlagTestsForAction = (type) => {
    const testErrorFlag = args => testErrorFlagsForAction(type, args);

    it('should not generate an errors object if no errors exist', () =>
      testErrorFlagsForAction(type, null, true));

    describe('for field', () => {
      describe('product', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PRODUCT, value: '+test', valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PRODUCT, value: '', valid: false,
        }));
      });

      describe('site', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_SITE,
          value: {
            url: 'https://amongstfew.com',
            name: 'Amongst Few',
            supported: true,
            auth: false,
          },
          valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_SITE,
          value: {},
          valid: false,
        }));
      });

      describe('profile', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PROFILE,
          value: {
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
          },
          valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PROFILE,
          value: {},
          valid: false,
        }));
      });

      describe('sizes', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_SIZES,
          value: ['XXS'],
          valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_SIZES,
          value: [],
          valid: false,
        }));
      });

      describe('username', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_USERNAME,
          value: 'test',
          valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_USERNAME,
          value: '',
          valid: false,
        }));
      });

      describe('password', () => {
        it('should not generate error flag when valid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PASSWORD,
          value: 'test',
          valid: true,
        }));

        it('should generate error flag when invalid', () => testErrorFlag({
          field: TASK_FIELDS.EDIT_PASSWORD,
          value: '',
          valid: false,
        }));
      });
    });
  };

  describe('for add action', () => {
    performErrorFlagTestsForAction(TASK_ACTIONS.ADD);
  });

  describe('for update action', () => {
    performErrorFlagTestsForAction(TASK_ACTIONS.UPDATE);
  });
});
