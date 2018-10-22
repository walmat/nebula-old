/* global describe it test expect jest */
import { serverListReducer } from '../../../../state/reducers/server/serverReducer';
import { SERVER_ACTIONS } from '../../../../state/actions';
import { initialServerStates } from '../../../../utils/definitions/serverDefinitions';

describe('server list reducer', () => {
  it('should return initial state', () => {
    const actual = serverListReducer(undefined, {});
    expect(actual).toEqual(initialServerStates.serverList);
  });

  it.skip('should handle connect action', () => {
    const newServerInfo = {
      id: 2,
      type: { id: 1, value: 'test_type', label: 'test_type_label' },
      size: { id: 1, value: 'test_size', label: 'test_size_label' },
      location: { id: 1, value: 'test_loc', label: 'test_loc_label' },
      charges: 0,
      status: 'Initializing...',
    };

    const expected = {
      servers: [
        newServerInfo,
      ],
      coreServer: {
        type: { id: 1, value: 'test_type', label: 'test_type_label' },
        size: { id: 1, value: 'test_size', label: 'test_size_label' },
        location: { id: 1, value: 'test_loc', label: 'test_loc_label' },
        errors: {},
      },
      path: 'testing...',
    };
    const actual = serverListReducer(
      initialServerStates.serverList,
      { type: SERVER_ACTIONS.CONNECT, serverInfo: expected },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle create action', () => {
    const newServerInfo = {
      serverOptions: {
        type: { id: 1, value: 'test_type', label: 'test_type_label' },
        size: { id: 1, value: 'test_size', label: 'test_size_label' },
        location: { id: 1, value: 'test_loc', label: 'test_loc_label' },
        errors: {},
      },
      path: 'testing...',
    };
    const expected = [{
      id: 'testing...',
      type: { id: 1, value: 'test_type', label: 'test_type_label' },
      size: { id: 1, value: 'test_size', label: 'test_size_label' },
      location: { id: 1, value: 'test_loc', label: 'test_loc_label' },
      charges: '0',
      status: 'Initializing...',
    }];
    const actual = serverListReducer(
      initialServerStates.serverList,
      { type: SERVER_ACTIONS.CREATE, serverInfo: newServerInfo },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle destroy action', () => {
    const serverPath = {
      TerminatingInstances: [
        { InstanceId: 'test' },
      ],
    };
    const start = [{
      id: 'test',
    }];
    const actual = serverListReducer(
      start,
      { type: SERVER_ACTIONS.DESTROY, serverPath },
    );
    expect(actual).toEqual([]);
  });

  it('should handle destroy all action', () => {
    const start = [
      { id: 'test' },
      { id: 'test2' },
    ];
    const actual = serverListReducer(
      start,
      { type: SERVER_ACTIONS.DESTROY_ALL, credentials: {} },
    );
    expect(actual).toEqual([]);
  });

  describe('should not respond to', () => {
    test('edit server action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.EDIT },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('start server action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.START },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('stop server action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.STOP },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('handle error action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.ERROR },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('generate proxies action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.GEN_PROXIES },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('destroy proxies action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.DESTROY_PROXIES },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('validate aws credentials actions', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.VALIDATE_AWS },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });

    test('logout aws action', () => {
      const actual = serverListReducer(
        initialServerStates.serverList,
        { type: SERVER_ACTIONS.LOGOUT_AWS },
      );
      expect(actual).toEqual(initialServerStates.serverList);
    });
  });
});
