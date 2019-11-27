import { initialState } from '../migrators';

const {
  servers: { credentials, proxies, proxyOptions, serverListOptions },
} = initialState;

export default {
  credentials,
  proxyOptions,
  serverListOptions,
  proxies,
};
