const baseTask = {
  id: '',
  index: 0,
  product: {
    raw: '',
    variant: null,
    pos: null,
    neg: null,
    url: null,
  },
  site: {
    name: null,
    url: null,
    supported: null,
    apiKey: null,
  },
  profile: null,
  size: null,
  account: null,
  status: 'idle',
  message: '',
  error: 3500,
  monitor: 3500,
  discord: '',
  slack: '',
  errors: {
    product: null,
    site: null,
    profile: null,
    size: null,
  },
  edits: {
    product: null,
    size: null,
    profile: null,
    account: null,
    site: null,
    errors: {
      product: null,
      size: null,
      profile: null,
      site: null,
    },
  },
};

export const NewTask = { ...baseTask };
export const SelectedTask = { ...baseTask };
export const Tasks = [];
