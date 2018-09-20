import awsCredentials, { initialAwsCredentialsState } from './server/awsCredentials';
import proxyOptions, { initialProxyOptionsState } from './server/proxyOptions';
import serverInfo, { initialServerInfoState } from './server/serverInfo';
import coreServer, { initialCoreServerState } from './server/coreServer';
import { serverList, serverRow, initialServerListState } from './server/serverList';
import serverListOptions from './server/serverListOptions';
import serverLocation from './server/serverLocation';
import serverOptions, { initialServerOptionsState } from './server/serverOptions';
import serverSize from './server/serverSize';
import serverType from './server/serverType';

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
  serverLocation,
  serverOptions,
  serverSize,
  serverType,
  serverRow,
};
