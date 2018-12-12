/* global describe expect it test jest */
import { taskReducer } from '../../../../state/reducers/tasks/taskReducer';
import { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { TASK_ACTIONS, TASK_FIELDS, mapTaskFieldsToKey } from '../../../../state/actions';

describe('task reducer', () => {
  it('should return initial state', () => {
    const actual = taskReducer(undefined, {});
    expect(actual).toEqual(initialTaskStates.task);
  });

  describe('should handle edit', () => {
    const checkGeneralFieldEdit = (field, value) => {
      const expected = {
        ...initialTaskStates.task,
        [mapTaskFieldsToKey[field]]: value,
      };
      const actual = taskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        field,
        value,
      });
      expect(actual).toEqual(expected);
    };

    const checkExistingFieldEdit = (field, value, id) => {
      const expected = {
        ...initialTaskStates.task,
        id,
        edits: {
          ...initialTaskStates.edit,
          [mapTaskFieldsToKey[field]]: value,
        },
      };
      const actual = taskReducer(
        {
          ...initialTaskStates.task,
          id,
        },
        {
          type: TASK_ACTIONS.EDIT,
          id,
          field,
          value,
        },
      );
      expect(actual).toEqual(expected);
    };

    const checkInvalidFieldEdit = (field, id) => {
      const start = {
        ...initialTaskStates.task,
        id: id || initialTaskStates.task.id,
      };
      const actual = taskReducer(start, {
        type: TASK_ACTIONS.EDIT,
        id,
        field,
      });
      expect(actual).toEqual(start);
    };

    describe('when editing a new task', () => {
      describe('when editing valid', () => {
        describe('product', () => {
          test('when passing raw value', () => {
            const start = {
              ...initialTaskStates.task,
              product: {
                raw: '+off, +white',
                pos_keywords: ['off', 'white'],
              },
            };
            const expected = {
              ...initialTaskStates.task,
              product: {
                ...initialTaskStates.product,
                raw: 'test',
              },
            };
            const actual = taskReducer(start, {
              type: TASK_ACTIONS.EDIT,
              field: TASK_FIELDS.EDIT_PRODUCT,
              value: 'test',
            });
            expect(actual).toEqual(expected);
          });

          describe('when passing url value', () => {
            test('which exists', () => {
              const start = {
                ...initialTaskStates.task,
                product: {
                  raw: '+off, +white',
                  pos_keywords: ['off', 'white'],
                },
              };
              const expected = {
                ...initialTaskStates.task,
                product: {
                  ...initialTaskStates.product,
                  raw: 'https://kith.com',
                },
                site: {
                  special: false,
                  apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
                  auth: false,
                  name: 'Kith',
                  url: 'https://kith.com',
                  supported: 'experimental',
                  sizeOptionIndex: 1,
                },
                username: null,
                password: null,
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'https://kith.com',
              });
              expect(actual).toEqual(expected);
            });

            test('which does not exist', () => {
              const start = {
                ...initialTaskStates.task,
                product: {
                  raw: '+off, +white',
                  pos_keywords: ['off', 'white'],
                },
              };
              const expected = {
                ...initialTaskStates.task,
                product: {
                  ...initialTaskStates.product,
                  raw: 'https://www.thisshouldcauseanoop.com',
                },
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'https://www.thisshouldcauseanoop.com',
              });
              expect(actual).toEqual(expected);
            });

            test('which is not a valid url', () => {
              const start = {
                ...initialTaskStates.task,
                product: {
                  raw: '+off, +white',
                  pos_keywords: ['off', 'white'],
                },
              };
              const expected = {
                ...initialTaskStates.task,
                product: {
                  ...initialTaskStates.product,
                  raw: 'http',
                },
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'http',
              });
              expect(actual).toEqual(expected);
            });
          });
        });

        test('username', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_USERNAME, 'test');
        });

        test('password', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PASSWORD, 'test');
        });

        test('site', () => {
          const start = {
            ...initialTaskStates.task,
            site: 'something else',
            username: 'username',
            password: 'password',
          };
          const expected = {
            ...initialTaskStates.task,
            site: 'test',
            username: null,
            password: null,
          };
          const actual = taskReducer(start, {
            type: TASK_ACTIONS.EDIT,
            field: TASK_FIELDS.EDIT_SITE,
            value: 'test',
          });
          expect(actual).toEqual(expected);
        });

        test('profile', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PROFILE, { id: 1 });
        });

        describe('sizes', () => {
          test('when adding sizes to an empty list', () => {
            checkGeneralFieldEdit(TASK_FIELDS.EDIT_SIZES, ['test']);
          });

          test('when resetting sizes to an empty list', () => {
            const initialState = {
              ...initialTaskStates.task,
              sizes: null,
            };
            const expected = {
              ...initialState,
              sizes: [],
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              field: TASK_FIELDS.EDIT_SIZES,
              value: null,
            });
            expect(actual).toEqual(expected);
          });

          test('when adding sizes to an existing list', () => {
            const initialState = {
              ...initialTaskStates.task,
              sizes: ['test'],
            };
            const expected = {
              ...initialState,
              sizes: ['test2', 'test3', 'test'],
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              field: TASK_FIELDS.EDIT_SIZES,
              value: ['test2', 'test3'],
            });
            expect(actual).toEqual(expected);
          });

          test('when removing sizes from an existing list', () => {
            const initialState = {
              ...initialTaskStates.task,
              sizes: ['test', 'test2', 'test3'],
            };
            const expected = {
              ...initialState,
              sizes: ['test2', 'test3'],
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              field: TASK_FIELDS.EDIT_SIZES,
              value: ['test2', 'test3'],
            });
            expect(actual).toEqual(expected);
          });
        });
      });

      describe('when editing empty', () => {
        test('product', () => {
          const start = {
            ...initialTaskStates.task,
            product: {
              raw: '+off, +white',
              pos_keywords: ['off', 'white'],
            },
          };
          const expected = {
            ...initialTaskStates.task,
            product: initialTaskStates.product,
          };
          const actual = taskReducer(start, {
            type: TASK_ACTIONS.EDIT,
            field: TASK_FIELDS.EDIT_PRODUCT,
            value: '',
          });
          expect(actual).toEqual(expected);
        });

        test('username', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_USERNAME, '');
        });

        test('password', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PASSWORD, '');
        });

        test('site', () => {
          const start = {
            ...initialTaskStates.task,
            site: 'something else',
            username: 'username',
            password: 'password',
          };
          const expected = {
            ...initialTaskStates.task,
            site: initialTaskStates.site,
            username: initialTaskStates.task.username,
            password: initialTaskStates.task.password,
          };
          const actual = taskReducer(start, {
            type: TASK_ACTIONS.EDIT,
            field: TASK_FIELDS.EDIT_SITE,
            value: '',
          });
          expect(actual).toEqual(expected);
        });

        test('profile', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PROFILE, { id: 1 });
        });

        test('sizes', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_SIZES, []);
        });
      });

      describe('when editing invalid', () => {
        test('product', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PRODUCT);
        });

        test('username', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_USERNAME);
        });

        test('password', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PASSWORD);
        });

        test('site', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_SITE);
        });

        test('profile', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PROFILE);
        });

        test('sizes', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_SIZES);
        });
      });

      test('when an invalid field is given', () => {
        const actual = taskReducer(initialTaskStates.task, {
          type: TASK_ACTIONS.EDIT,
          field: 'INVALID',
        });
        expect(actual).toEqual(initialTaskStates.task);
      });

      test('when no field is given', () => {
        const actual = taskReducer(initialTaskStates.task, {
          type: TASK_ACTIONS.EDIT,
        });
        expect(actual).toEqual(initialTaskStates.task);
      });
    });

    describe('when editing an existing task', () => {
      describe('when editing valid', () => {
        describe('product', () => {
          test('when passing raw value', () => {
            const start = {
              ...initialTaskStates.task,
              id: 1,
              edits: {
                ...initialTaskStates.edit,
                product: {
                  ...initialTaskStates.product,
                  raw: '+off, +white',
                  pos_keywords: ['off', 'white'],
                },
              },
            };
            const expected = {
              ...start,
              edits: {
                ...start.edits,
                product: {
                  ...initialTaskStates.product,
                  raw: 'test',
                },
              },
            };
            const actual = taskReducer(start, {
              type: TASK_ACTIONS.EDIT,
              id: 1,
              field: TASK_FIELDS.EDIT_PRODUCT,
              value: 'test',
            });
            expect(actual).toEqual(expected);
          });

          describe('when passing url value', () => {
            test('which exists', () => {
              const start = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    raw: '+off, +white',
                    pos_keywords: ['off', 'white'],
                  },
                },
              };
              const expected = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    ...initialTaskStates.product,
                    raw: 'https://kith.com',
                  },
                  site: {
                    special: false,
                    apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
                    auth: false,
                    name: 'Kith',
                    url: 'https://kith.com',
                    supported: 'experimental',
                    sizeOptionIndex: 1,
                  },
                  username: null,
                  password: null,
                },
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                id: 1,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'https://kith.com',
              });
              expect(actual).toEqual(expected);
            });

            test('which does not exist', () => {
              const start = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    raw: '+off, +white',
                    pos_keywords: ['off', 'white'],
                  },
                },
              };
              const expected = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    ...initialTaskStates.product,
                    raw: 'https://www.thisshouldcauseanoop.com',
                  },
                },
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                id: 1,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'https://www.thisshouldcauseanoop.com',
              });
              expect(actual).toEqual(expected);
            });

            test('which is not a valid url', () => {
              const start = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    raw: '+off, +white',
                    pos_keywords: ['off', 'white'],
                  },
                },
              };
              const expected = {
                ...initialTaskStates.task,
                edits: {
                  ...initialTaskStates.edit,
                  product: {
                    ...initialTaskStates.product,
                    raw: 'http',
                  },
                },
              };
              const actual = taskReducer(start, {
                type: TASK_ACTIONS.EDIT,
                id: 1,
                field: TASK_FIELDS.EDIT_PRODUCT,
                value: 'http',
              });
              expect(actual).toEqual(expected);
            });
          });
        });

        test('username', () => {
          checkExistingFieldEdit(TASK_FIELDS.EDIT_USERNAME, 'test', 1);
        });

        test('password', () => {
          checkExistingFieldEdit(TASK_FIELDS.EDIT_PASSWORD, 'test', 1);
        });

        test('site', () => {
          checkExistingFieldEdit(TASK_FIELDS.EDIT_SITE, 'test', 1);
        });

        test('profile', () => {
          checkExistingFieldEdit(TASK_FIELDS.EDIT_PROFILE, { id: 1 }, 1);
        });

        describe('sizes', () => {
          test('when adding sizes to an empty list', () => {
            checkExistingFieldEdit(TASK_FIELDS.EDIT_SIZES, ['test'], 1);
          });

          test('when resetting sizes to an empty list', () => {
            const initialState = {
              ...initialTaskStates.task,
              edits: {
                ...initialTaskStates.edit,
                sizes: ['test'],
              },
            };
            const expected = {
              ...initialState,
              sizes: [],
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              field: TASK_FIELDS.EDIT_SIZES,
              value: null,
            });
            expect(actual).toEqual(expected);
          });

          test('when adding sizes to an existing list', () => {
            const initialState = {
              ...initialTaskStates.task,
              edits: {
                ...initialTaskStates.edit,
                sizes: ['test'],
              },
            };
            const expected = {
              ...initialState,
              edits: {
                ...initialState.edits,
                sizes: ['test2', 'test3', 'test'],
              },
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              id: 1,
              field: TASK_FIELDS.EDIT_SIZES,
              value: ['test2', 'test3'],
            });
            expect(actual).toEqual(expected);
          });

          test('when removing sizes from an existing list', () => {
            const initialState = {
              ...initialTaskStates.task,
              edits: {
                ...initialTaskStates.edit,
                sizes: ['test', 'test2', 'test3'],
              },
            };
            const expected = {
              ...initialState,
              edits: {
                ...initialState.edits,
                sizes: ['test2', 'test3'],
              },
            };
            const actual = taskReducer(initialState, {
              type: TASK_ACTIONS.EDIT,
              id: 1,
              field: TASK_FIELDS.EDIT_SIZES,
              value: ['test2', 'test3'],
            });
            expect(actual).toEqual(expected);
          });
        });
      });

      describe('when editing empty', () => {
        test('product', () => {
          const start = {
            ...initialTaskStates.task,
            id: 1,
            edits: {
              ...initialTaskStates.edit,
              product: {
                raw: '+off, +white',
                pos_keywords: ['off', 'white'],
              },
            },
          };
          const expected = {
            ...initialTaskStates.task,
            id: 1,
          };
          const actual = taskReducer(start, {
            type: TASK_ACTIONS.EDIT,
            field: TASK_FIELDS.EDIT_PRODUCT,
            value: '',
            id: 1,
          });
          expect(actual).toEqual(expected);
        });

        test('username', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_USERNAME, '', 1);
        });

        test('password', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PASSWORD, '', 1);
        });

        test('site', () => {
          const start = {
            ...initialTaskStates.task,
            id: 1,
            edits: {
              ...initialTaskStates.edit,
              site: 'something else',
              username: 'username',
              password: 'password',
            },
          };
          const expected = {
            ...initialTaskStates.task,
            id: 1,
            edits: {
              ...initialTaskStates.edit,
              site: initialTaskStates.edit.site,
              username: initialTaskStates.edit.username,
              password: initialTaskStates.edit.password,
            },
          };
          const actual = taskReducer(start, {
            type: TASK_ACTIONS.EDIT,
            field: TASK_FIELDS.EDIT_SITE,
            value: null,
            id: 1,
          });
          expect(actual).toEqual(expected);
        });

        test('profile', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_PROFILE, { id: 1 }, 1);
        });

        test('sizes', () => {
          checkGeneralFieldEdit(TASK_FIELDS.EDIT_SIZES, [], 1);
        });
      });

      describe('when editing invalid', () => {
        test('product', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PRODUCT, 1);
        });

        test('username', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_USERNAME, 1);
        });

        test('password', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PASSWORD, 1);
        });

        test('site', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_SITE, 1);
        });

        test('profile', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_PROFILE, 1);
        });

        test('sizes', () => {
          checkInvalidFieldEdit(TASK_FIELDS.EDIT_SIZES, 1);
        });
      });

      test('when an invalid field is given', () => {
        const actual = taskReducer(initialTaskStates.task, {
          type: TASK_ACTIONS.EDIT,
          id: 1,
          field: 'INVALID',
        });
        expect(actual).toEqual(initialTaskStates.task);
      });

      test('when no field is given', () => {
        const actual = taskReducer(initialTaskStates.task, {
          type: TASK_ACTIONS.EDIT,
          id: 1,
        });
        expect(actual).toEqual(initialTaskStates.task);
      });
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = taskReducer(initialTaskStates.task, { type });
      expect(actual).toEqual(initialTaskStates.task);
    };

    test('add action', () => {
      _testNoopResponse(TASK_ACTIONS.ADD);
    });

    test('destroy action', () => {
      _testNoopResponse(TASK_ACTIONS.REMOVE);
    });

    test('select action', () => {
      _testNoopResponse(TASK_ACTIONS.SELECT);
    });

    test('load action', () => {
      _testNoopResponse(TASK_ACTIONS.LOAD);
    });

    test('update action', () => {
      _testNoopResponse(TASK_ACTIONS.UPDATE);
    });

    test('start action', () => {
      _testNoopResponse(TASK_ACTIONS.START);
    });

    test('stop action', () => {
      _testNoopResponse(TASK_ACTIONS.STOP);
    });

    test('error action', () => {
      _testNoopResponse(TASK_ACTIONS.ERROR);
    });
  });
});
