import { initialState } from '../migrators';

const { serverInfo, servers: serverList } = initialState;
const { credentials: awsCredentials, coreServer, proxyOptions, serverOptions } = serverInfo;
const serverProperty = {
  id: null,
  value: '',
  label: '',
};
const server = {
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
  charges: '',
  status: '',
  action: '',
};

export default {
  awsCredentials,
  coreServer,
  proxyOptions,
  serverInfo,
  serverOptions,
  serverList,
  serverProperty,
  server,
};
