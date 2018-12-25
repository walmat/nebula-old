/* eslint-disable no-nested-ternary */
/* global describe expect it test jest beforeEach */
import tasksFormValidationMiddleware from '../../../../state/middleware/tasks/tasksFormValidationMiddleware';
import { TASK_ACTIONS, TASK_FIELDS, mapTaskFieldsToKey } from '../../../../state/actions';
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

  it("should pass through actions that aren't a task add or update type", () => {
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

    const testNoop = payload => {
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

    describe('null response given', () => {
      test('when type is add', () =>
        testNoop({
          type: TASK_ACTIONS.ADD,
          response: null,
        }));

      test('when type is update', () =>
        testNoop({
          type: TASK_ACTIONS.UPDATE,
          response: null,
        }));
    });

    describe('no response given', () => {
      test('when type is add', () =>
        testNoop({
          type: TASK_ACTIONS.ADD,
        }));

      test('when type is update', () =>
        testNoop({
          type: TASK_ACTIONS.UPDATE,
        }));
    });

    describe('no response id given', () => {
      test('when type is update', () =>
        testNoop({
          type: TASK_ACTIONS.UPDATE,
          response: {
            id: null,
          },
        }));
    });
  });

  const generateActions = (type, field, value, testValid) => {
    const actionBase = {
      task: {
        ...initialTaskStates.task,
        id: type === TASK_ACTIONS.ADD ? null : '1',
        product: testValid
          ? {
              ...initialTaskStates.task.product,
              raw: 'https',
            }
          : {
              ...initialTaskStates.task.product,
              raw: '+test',
            },
        site: testValid
          ? {
              ...initialTaskStates.task.site,
              name: 'invalid',
            }
          : {
              ...initialTaskStates.task.site,
              name: 'Undefeated',
              auth: 'true',
            },
        profile: testValid
          ? {
              ...initialProfileStates.profile,
            }
          : {
              ...initialProfileStates.profile,
              id: '1',
              profileName: 'test',
              billingMatchesShipping: false,
              payment: {
                ...initialProfileStates.payment,
                email: 'test@me.com',
                cardNumber: '4111111111111',
                exp: '12/34',
                cvv: '123',
              },
              billing: {
                ...initialProfileStates.location,
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
                ...initialProfileStates.location,
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
        sizes: testValid ? [] : ['XXS'],
        username: testValid ? '' : 'test',
        password: testValid ? '' : 'test',
        edits: {
          ...initialTaskStates.task.edits,
          product:
            type === TASK_ACTIONS.UPDATE
              ? testValid
                ? {
                    ...initialTaskStates.task.product,
                    raw: 'https',
                  }
                : {
                    ...initialTaskStates.task.product,
                    raw: '+test',
                  }
              : null,
          site:
            type === TASK_ACTIONS.UPDATE
              ? testValid
                ? {
                    ...initialTaskStates.task.site,
                    name: 'invalid',
                  }
                : {
                    ...initialTaskStates.task.site,
                    name: 'Undefeated',
                    auth: 'true',
                  }
              : null,
          profile:
            type === TASK_ACTIONS.UPDATE
              ? testValid
                ? {
                    ...initialProfileStates.profile,
                  }
                : {
                    ...initialProfileStates.profile,
                    id: '1',
                    profileName: 'test',
                    billingMatchesShipping: false,
                    payment: {
                      ...initialProfileStates.payment,
                      email: 'test@me.com',
                      cardNumber: '4111111111111',
                      exp: '12/34',
                      cvv: '123',
                    },
                    billing: {
                      ...initialProfileStates.location,
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
                      ...initialProfileStates.location,
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
                  }
              : null,
          sizes: type === TASK_ACTIONS.UPDATE ? (testValid ? [] : ['XXS']) : null,
          username: type === TASK_ACTIONS.UPDATE ? (testValid ? '' : 'test') : null,
          password: type === TASK_ACTIONS.UPDATE ? (testValid ? '' : 'test') : null,
        },
        errorDelay: 1500,
        monitorDelay: 1500,
      },
    };

    const expectedActionBase = {
      ...actionBase,
      task: {
        ...actionBase.task,
        errors:
          type === TASK_ACTIONS.ADD
            ? {
                ...actionBase.task.errors,
                product: testValid,
                site: testValid,
                profile: testValid,
                sizes: testValid,
                username:
                  (field === TASK_FIELDS.EDIT_SITE && value.auth) ||
                  field === TASK_FIELDS.EDIT_USERNAME
                    ? testValid
                    : false,
                password:
                  (field === TASK_FIELDS.EDIT_SITE && value.auth) ||
                  field === TASK_FIELDS.EDIT_PASSWORD
                    ? testValid
                    : false,
              }
            : {
                ...actionBase.task.errors,
                password: null,
                product: null,
                profile: null,
                site: null,
                sizes: null,
                username: null,
              },
        edits: {
          ...actionBase.task.edits,
          errors:
            type === TASK_ACTIONS.ADD
              ? {
                  ...actionBase.task.edits.errors,
                  password: null,
                  product: null,
                  profile: null,
                  site: null,
                  sizes: null,
                  username: null,
                }
              : {
                  ...actionBase.task.edits.errors,
                  product: testValid,
                  profile: testValid,
                  site: testValid,
                  sizes: testValid,
                  username:
                    (field === TASK_FIELDS.EDIT_SITE && value.auth) ||
                    field === TASK_FIELDS.EDIT_USERNAME
                      ? testValid
                      : false,
                  password:
                    (field === TASK_FIELDS.EDIT_SITE && value.auth) ||
                    field === TASK_FIELDS.EDIT_PASSWORD
                      ? testValid
                      : false,
                },
        },
      },
    };

    const action = {
      type,
      response: {
        task:
          type === TASK_ACTIONS.ADD
            ? {
                ...actionBase.task,
                [mapTaskFieldsToKey[field]]: value,
                edits: {
                  ...actionBase.task.edits,
                },
              }
            : {
                ...actionBase.task,
                edits: {
                  ...actionBase.task.edits,
                  [mapTaskFieldsToKey[field]]: value,
                },
              },
      },
    };

    const expectedAction = {
      ...action,
      response: {
        ...expectedActionBase,
        task: {
          ...actionBase.task,
          ...expectedActionBase.task,
          [mapTaskFieldsToKey[field]]:
            type === TASK_ACTIONS.ADD ? value : action.response.task[mapTaskFieldsToKey[field]],
          errors: {
            ...actionBase.task.errors,
            ...expectedActionBase.task.errors,
            [mapTaskFieldsToKey[field]]: type === TASK_ACTIONS.ADD ? !testValid : null,
          },
          edits: {
            ...actionBase.task.edits,
            ...expectedActionBase.task.edits,
            [mapTaskFieldsToKey[field]]: type === TASK_ACTIONS.ADD ? null : value,
            errors: {
              ...actionBase.task.edits.errors,
              ...expectedActionBase.task.edits.errors,
              [mapTaskFieldsToKey[field]]: type === TASK_ACTIONS.ADD ? null : !testValid,
            },
          },
        },
      },
    };

    if (type === TASK_ACTIONS.ADD) {
      expectedAction.errors = {
        ...expectedAction.response.task.errors,
        [mapTaskFieldsToKey[field]]: !testValid,
      };
    } else if (type === TASK_ACTIONS.UPDATE) {
      expectedAction.errors = {
        ...expectedAction.response.task.edits.errors,
        [mapTaskFieldsToKey[field]]: !testValid,
      };
    }

    return {
      action,
      expectedAction,
    };
  };

  const testErrorFlagsForAction = (type, args, genNoErrors) => {
    // get args or mock them if we aren't generating errors
    const { field, value, valid } = !genNoErrors
      ? args
      : {
          value: 'test',
          valid: false,
        };

    const { store, next, invoke } = create();
    const { action, expectedAction } = generateActions(type, field, value, valid);
    if (genNoErrors) {
      // delete expected errors field if we aren't generating errors
      delete expectedAction.errors;
      delete action.response.task.undefined;
      delete action.response.task.edits.undefined;

      delete expectedAction.response.task.undefined;
      delete expectedAction.response.task.errors.undefined;
      delete expectedAction.response.task.edits.undefined;
      delete expectedAction.response.task.edits.errors.undefined;
    }
    invoke(action);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expectedAction);
  };

  const performErrorFlagTestsForAction = type => {
    const testErrorFlag = args => testErrorFlagsForAction(type, args);

    it('should not generate an errors object if no errors exist', () =>
      testErrorFlagsForAction(type, null, true));

    describe('for field', () => {
      describe('product', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_PRODUCT,
            value: '+test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_PRODUCT,
            value: '',
            valid: false,
          }));
      });

      describe('site', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_SITE,
            value: {
              label: '12AM Run',
              value: 'https://12amrun.com',
              apiKey: 'e5b0d0dc103ac126c494f8cc1fd70fe9',
              auth: 'false',
            },
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_SITE,
            value: {},
            valid: false,
          }));
      });

      describe('profile', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
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

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_PROFILE,
            value: {},
            valid: false,
          }));
      });

      describe('sizes', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_SIZES,
            value: ['XXS'],
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_SIZES,
            value: [],
            valid: false,
          }));
      });

      describe('username', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_USERNAME,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_USERNAME,
            value: '',
            valid: false,
          }));
      });

      describe('password', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: TASK_FIELDS.EDIT_PASSWORD,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
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
