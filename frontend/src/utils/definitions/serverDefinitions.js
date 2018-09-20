import awsCredentials, { initialAwsCredentialsState } from './server/awsCredentials';
import proxyOptions, { initialProxyOptionsState } from './server/proxyOptions';
import serverInfo, { initialServerInfoState } from './server/serverInfo';
import coreServer, { initialCoreServerState } from './server/coreServer';
import { serverList, serverRow, initialServerListState } from './server/serverList';
import serverListOptions from './server/serverListOptions';
import serverProperty from './server/serverProperty';
import serverOptions, { initialServerOptionsState } from './server/serverOptions';

export const initialServerStates = {
  awsCredentials: initialAwsCredentialsState,
  coreServer: initialCoreServerState,
  proxyOptions: initialProxyOptionsState,
  serverInfo: initialServerInfoState,
  serverOptions: initialServerOptionsState,
  serverList: initialServerListState,
};

export default {
  awsCredentials,
  coreServer,
  proxyOptions,
  serverInfo,
  serverList,
  serverListOptions,
  serverProperty,
  serverOptions,
  serverRow,
};
