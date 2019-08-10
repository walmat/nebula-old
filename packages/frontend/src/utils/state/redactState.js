/**
 * State Redaction
 *
 * A utility function that takes the latest version state and "redacts" it by
 * removing any private information from the incoming state object. The
 * incoming object is assumed to be of the latest migrator version.
 */
export default function redactState(state) {
  if (!state) {
    return {};
  }

  const redactTask = task => {
    if (!task) {
      return task;
    }
    return {
      ...task,
      discord: undefined,
      slack: undefined,
      proxy: undefined,
      profile: undefined,
      username: undefined,
      password: undefined,
      edits: {
        ...task.edits,
        password: undefined,
        username: undefined,
        profile: undefined,
      },
    };
  };

  return {
    ...state,
    currentProfile: undefined,
    selectedProfile: undefined,
    profiles: state.profiles.map(() => undefined), // perform a map so we still get the count
    newTask: redactTask(state.newTask),
    selectedTask: redactTask(state.selectedTask),
    tasks: state.tasks.map(redactTask),
    serverListOptions: undefined, // this isn't private, but it is constant (i.e. unnecessary data we don't need)
    settings: {
      ...state.settings,
      defaults: {
        ...state.settings.defaults,
        edits: {
          ...state.settings.defaults.edits,
          profile: undefined,
        },
        profile: undefined,
      },
      discord: undefined,
      slack: undefined,
      proxies: state.settings.proxies.map(() => undefined), // perform a map so we still get the count
      shipping: {
        ...state.settings.shipping,
        name: undefined,
        username: undefined,
        password: undefined,
        profile: undefined,
      },
    },
    servers: {
      ...state.servers,
      proxies: state.servers.proxies.map(() => undefined), // perform a map so we can still get the count
      serverListOptions: undefined, // this isn't private, but it is constant (i.e. unnecessary data we don't need)
      credentials: {
        ...state.servers.credentials,
        current: undefined,
        selected: undefined,
        list: state.servers.credentials.list.map(() => undefined), // perform a map so we can still get the count
      },
      proxyOptions: {
        ...state.servers.proxyOptions,
        credentials: undefined,
        username: undefined,
        password: undefined,
      },
    },
  };
}
