import awsCredentials, { initialAwsCredentialsState } from './server/awsCredentials';
import proxyOptions, { initialProxyOptionsState } from './server/proxyOptions';
import serverInfo, { initialServerInfoState } from './server/serverInfo';
import coreServer, { initialCoreServerState } from './server/coreServer';
import { serverList, server, initialServerListState, initialServerState } from './server/serverList';
import serverListOptions from './server/serverListOptions';
import serverProperty, { initialServerPropertyState } from './server/serverProperty';
import serverOptions, { initialServerOptionsState } from './server/serverOptions';

export const initialServerStates = {
  awsCredentials: initialAwsCredentialsState,
  coreServer: initialCoreServerState,
  proxyOptions: initialProxyOptionsState,
  serverInfo: initialServerInfoState,
  serverOptions: initialServerOptionsState,
  serverList: initialServerListState,
  serverProperty: initialServerPropertyState,
  server: initialServerState,
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
  server,
};
