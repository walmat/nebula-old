/* global describe it test expect jest */
import { serverReducer } from '../../../../state/reducers/server/serverReducer';
import { SERVER_ACTIONS, SERVER_FIELDS } from '../../../../state/actions';
import { initialServerStates } from '../../../../utils/definitions/serverDefinitions';

describe('server reducer', () => {
  it('should return initial state', () => {
    const expected = initialServerStates.serverInfo;
    const actual = serverReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  describe('should handle edit', () => {
    describe('server type action', () => {
      test('when type has not been selected before', () => {
        const expected = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 1, value: 'test', label: 'test_label' },
          },
        };
        const actual = serverReducer(
          initialServerStates.serverInfo,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_SERVER_TYPE,
            value: { id: 1, value: 'test', label: 'test_label' },
          },
        );
        expect(actual).toEqual(expected);
      });

      test('when type changes', () => {
        const start = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 1, value: 'test', label: 'test_label' },
          },
        };
        const expected = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 2, value: 'test2', label: 'test_label2' },
          },
        };
        const actual = serverReducer(
          start,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_SERVER_TYPE,
            value: { id: 2, value: 'test2', label: 'test_label2' },
          },
        );
        expect(actual).toEqual(expected);
      });

      test('when type gets set to the same type', () => {
        const expected = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 1, value: 'test', label: 'test_label' },
            size: { id: 1, value: 'test', label: 'test_label' },
          },
        };
        const actual = serverReducer(
          expected,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_SERVER_TYPE,
            value: { id: 1, value: 'test', label: 'test_label' },
          },
        );
        expect(actual).toEqual(expected);
      });

      test('when type changes and size was previously set', () => {
        const start = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 1, value: 'test', label: 'test_label' },
            size: { id: 1, value: 'test', label: 'test_label' },
          },
        };
        const expected = {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: { id: 2, value: 'test2', label: 'test_label2' },
          },
        };
        const actual = serverReducer(
          start,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_SERVER_TYPE,
            value: { id: 2, value: 'test2', label: 'test_label2' },
          },
        );
        expect(actual).toEqual(expected);
      });
    });

    test('server size action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        serverOptions: {
          ...initialServerStates.serverOptions,
          size: { id: 1, value: 'test', label: 'test_label' },
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_SERVER_SIZE,
          value: { id: 1, value: 'test', label: 'test_label' },
        },
      );
      expect(actual).toEqual(expected);
    });

    test('server location action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        serverOptions: {
          ...initialServerStates.serverOptions,
          location: { id: 1, value: 'test', label: 'test_label' },
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_SERVER_LOCATION,
          value: { id: 1, value: 'test', label: 'test_label' },
        },
      );
      expect(actual).toEqual(expected);
    });

    describe('proxy number action', () => {
      it('when proxy number is valid', () => {
        const expected = {
          ...initialServerStates.serverInfo,
          proxyOptions: {
            ...initialServerStates.proxyOptions,
            numProxies: 23,
          },
        };
        const actual = serverReducer(
          initialServerStates.serverInfo,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_PROXY_NUMBER,
            value: '23',
          },
        );
        expect(actual).toEqual(expected);
      });

      it('when proxy number is empty', () => {
        const expected = {
          ...initialServerStates.serverInfo,
          proxyOptions: {
            ...initialServerStates.proxyOptions,
            numProxies: 0,
          },
        };
        const actual = serverReducer(
          initialServerStates.serverInfo,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_PROXY_NUMBER,
            value: '',
          },
        );
        expect(actual).toEqual(expected);
      });

      it('when proxy number is invalid', () => {
        const actual = serverReducer(
          initialServerStates.serverInfo,
          {
            type: SERVER_ACTIONS.EDIT,
            id: null,
            field: SERVER_FIELDS.EDIT_PROXY_NUMBER,
            value: 'invalid',
          },
        );
        expect(actual).toEqual(initialServerStates.serverInfo);
      });
    });

    test('proxy username action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        proxyOptions: {
          ...initialServerStates.proxyOptions,
          username: 'testing',
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_PROXY_USERNAME,
          value: 'testing',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('proxy password action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        proxyOptions: {
          ...initialServerStates.proxyOptions,
          password: 'testing',
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_PROXY_PASSWORD,
          value: 'testing',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('aws access key action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        credentials: {
          ...initialServerStates.awsCredentials,
          AWSAccessKey: 'testing',
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_AWS_ACCESS_KEY,
          value: 'testing',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('aws secret key action', () => {
      const expected = {
        ...initialServerStates.serverInfo,
        credentials: {
          ...initialServerStates.awsCredentials,
          AWSSecretKey: 'testing',
        },
      };
      const actual = serverReducer(
        initialServerStates.serverInfo,
        {
          type: SERVER_ACTIONS.EDIT,
          id: null,
          field: SERVER_FIELDS.EDIT_AWS_SECRET_KEY,
          value: 'testing',
        },
      );
      expect(actual).toEqual(expected);
    });
  });

  it('should handle error action', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const actual = serverReducer(
      initialServerStates.serverInfo,
      { type: SERVER_ACTIONS.ERROR, action: SERVER_ACTIONS.CREATE, error: 'testing' },
    );
    expect(actual).toEqual(initialServerStates.serverInfo);
    expect(spy).toHaveBeenCalled();
  });

  it('should handle generate proxies action', () => {
    const expected = {
      ...initialServerStates.serverInfo,
      proxies: [1, 2, 3],
    };
    const actual = serverReducer(
      initialServerStates.serverInfo,
      { type: SERVER_ACTIONS.GEN_PROXIES, proxies: [1, 2, 3] },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle destroy proxies action', () => {
    const start = {
      ...initialServerStates.serverInfo,
      proxies: [1, 2, 3],
    };
    const actual = serverReducer(start, { type: SERVER_ACTIONS.DESTROY_PROXIES });
    expect(actual).toEqual(initialServerStates.serverInfo);
  });

  it('should handle validate aws credentials', () => {
    const expected = {
      ...initialServerStates.serverInfo,
      credentials: {
        ...initialServerStates.awsCredentials,
        accessToken: 'test_token',
      },
    };
    const actual = serverReducer(
      initialServerStates.serverInfo,
      { type: SERVER_ACTIONS.VALIDATE_AWS, token: 'test_token' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle logout aws action', () => {
    const start = {
      ...initialServerStates.serverInfo,
      credentials: {
        AWSAccessKey: 'test access key',
        AWSSecretKey: 'test secret key',
        accessToken: 'test token',
      },
    };
    const actual = serverReducer(start, { type: SERVER_ACTIONS.LOGOUT_AWS });
    expect(actual).toEqual(initialServerStates.serverInfo);
    expect(actual).not.toEqual(start);
  });

  describe('should not respond to', () => {
    test('create server action', () => {
      const actual = serverReducer(
        initialServerStates.serverInfo,
        { type: SERVER_ACTIONS.CREATE },
      );
      expect(actual).toEqual(initialServerStates.serverInfo);
    });

    test('start server action', () => {
      const actual = serverReducer(
        initialServerStates.serverInfo,
        { type: SERVER_ACTIONS.START },
      );
      expect(actual).toEqual(initialServerStates.serverInfo);
    });

    test('stop server action', () => {
      const actual = serverReducer(
        initialServerStates.serverInfo,
        { type: SERVER_ACTIONS.STOP },
      );
      expect(actual).toEqual(initialServerStates.serverInfo);
    });

    test('destroy server action', () => {
      const actual = serverReducer(
        initialServerStates.serverInfo,
        { type: SERVER_ACTIONS.DESTROY },
      );
      expect(actual).toEqual(initialServerStates.serverInfo);
    });

    test('destroy all servers action', () => {
      const actual = serverReducer(
        initialServerStates.serverInfo,
        { type: SERVER_ACTIONS.DESTROY_ALL },
      );
      expect(actual).toEqual(initialServerStates.serverInfo);
    });
  });
});
