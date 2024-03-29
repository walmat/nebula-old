/* global describe */
import sDefns from '../../../../utils/definitions/serverDefinitions';
import initialServerStates from '../../../../state/initial/servers';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('awsCredentials definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testCredentialsKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.awsCredentials,
      initialServerStates.awsCredentials,
      spy,
    );

  testCredentialsKey('AWSAccessKey', [null, 'test'], [{}, 3, false]);
  testCredentialsKey('AWSSecretKey', [null, 'test'], [{}, 3, false]);
  testCredentialsKey('accessToken', [null, 'test'], [{}, 3, false]);
});
