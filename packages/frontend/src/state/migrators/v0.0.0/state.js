import serverListOptions from '../../../utils/servers'; // TODO: should we make a copy to reference this?
import { THEMES } from '../../../constants/themes';

// Source: locationState.js @ v1.0.0-beta.6.2
const initialLocationState = {
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  country: null,
  province: null,
  zipCode: '',
  phone: '',
  // Source: locationStateErrors.js @ v1.0.0-beta.6.2
  errors: {
    firstName: null,
    lastName: null,
    address: null,
    apt: null,
    city: null,
    country: null,
    province: null,
    zipCode: null,
    phone: null,
  },
};

// Source: paymentState.js @ v1.0.0-beta.6.2
const initialPaymentState = {
  email: '',
  cardNumber: '',
  exp: '',
  cvv: '',
  // Source: paymentStateErrors.js @ v1.0.0-beta.6.2
  errors: {
    email: null,
    cardNumber: null,
    exp: null,
    cvv: null,
  },
};

// Source: profile.js @ v1.0.0-beta.6.2
const initialProfileState = {
  id: null,
  profileName: '',
  errors: {
    profileName: null,
  },
  billingMatchesShipping: false,
  shipping: initialLocationState,
  billing: initialLocationState,
  payment: initialPaymentState,
};

// Source: settings.js @ v1.0.0-beta.6.2
const initialSettingsState = {
  proxies: [],
  // Source: defaults.js @ v1.0.0-beta.6.2
  defaults: {
    profile: initialProfileState,
    sizes: [],
    useProfile: false,
    useSizes: false,
    edits: {
      profile: initialProfileState,
      sizes: [],
    },
  },
  monitorDelay: 1500,
  errorDelay: 1500,
  discord: '',
  slack: '',
  // Source: settingsErrors.js @ v1.0.0-beta.6.2
  errors: {
    // Source: proxyErrors.js @ v1.0.0-beta.6.2
    proxies: [],
    // Source: defaultsErrors.js @ v1.0.0-beta.6.2
    defaults: {
      profile: null,
      sizes: null,
    },
    discord: null,
    slack: null,
  },
};

// Source: task.js @ v1.0.0-beta.6.2
const initialTaskState = {
  id: '',
  index: 0,
  // Source: taskProduct.js @ v1.0.0-beta.6.2
  product: {
    raw: '',
    variant: null,
    pos_keywords: null,
    neg_keywords: null,
    url: null,
  },
  // Source: taskSite.js @ v1.0.0-beta.6.2
  site: {
    name: null,
    url: null,
    supported: null,
    apiKey: null,
    auth: null,
  },
  profile: initialProfileState,
  // Source: taskList.js @ v1.0.0-beta.6.2
  sizes: [],
  username: '',
  password: '',
  status: 'idle',
  output: '',
  errorDelay: initialSettingsState.errorDelay,
  monitorDelay: initialSettingsState.monitorDelay,
  discord: initialSettingsState.discord,
  slack: initialSettingsState.slack,
  // Source taskErrors.js @ v1.0.0-beta.6.2
  errors: {
    product: null,
    site: null,
    profile: null,
    sizes: null,
    username: null,
    password: null,
  },
  // Source: taskEdit.js @ v1.0.0-beta.6.2
  edits: {
    product: null,
    sizes: null,
    profile: null,
    username: null,
    password: null,
    site: null,
    // Source: taskEditErrors.js @ v1.0.0-beta.6.2
    errors: {
      product: null,
      sizes: null,
      profile: null,
      username: null,
      password: null,
      site: null,
    },
  },
};

/**
 * v0.0.0 State
 *
 * This state represents the current state tree before a version
 * has been attached. This will be used as the base for all newer
 * versions as we make changes.
 *
 * References to the original source files of the parts of this
 * state tree are added where applicable. A tag is also given in
 * case files are moved/renamed/deleted so users can checkout the
 * given tag and see the source files.
 */
// Source: reducers.js @ v1.0.0-beta.6.2
export default {
  // Source: profileList.js @ v1.0.0-beta.6.2
  profiles: [],
  selectedProfile: initialProfileState,
  currentProfile: initialProfileState,
  // Source: taskList.js @ v1.0.0-beta.6.2
  tasks: [],
  newTask: initialTaskState,
  // Source: navbarReducer.js @ v1.0.0-beta.6.2
  navbar: {
    location: '/tasks',
  },
  selectedTask: initialTaskState,
  settings: initialSettingsState,
  // Source serverInfo.js @ v1.0.0-beta.6.2
  serverInfo: {
    // Source: awsCrednetials.js @ v1.0.0-beta.6.2
    credentials: {
      AWSAccessKey: '',
      AWSSecretKey: '',
      accessToken: null,
      errors: {},
    },
    // Source proxyOptions.js @ v1.0.0-beta.6.2
    proxyOptions: {
      numProxies: 0,
      location: null,
      username: '',
      password: '',
      errors: {},
    },
    // Source: coreServer.js @ v1.0.0-beta.6.2
    coreServer: {
      path: null,
      serverOptions: null,
      awsCredentials: null,
      errors: {},
    },
    proxies: [],
    // Source: serverOptions.js @ v1.0.0-beta.6.2
    serverOptions: {
      type: null,
      size: null,
      location: null,
      errors: {},
    },
    errors: {},
  },
  // Source: serverList.js @ v1.0.0-beta.6.2
  servers: [],
  // Source: utils/servers.js @ v1.0.0-beta.6.2
  serverListOptions,
  // Source: constants/themes.js @ v1.0.0-beta.6.2
  theme: THEMES.LIGHT,
};
