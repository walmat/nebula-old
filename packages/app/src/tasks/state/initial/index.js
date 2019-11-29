const baseTask = {
  id: null,
  site: null,
  product: {
    raw: '',
    variant: null,
    pos: null,
    neg: null,
    url: null,
  },
  profile: null,
  size: null,
  account: null,
  status: 'idle',
  message: '',
  error: 3500,
  monitor: 3500,
  errors: {
    site: null,
    product: null,
    profile: null,
    size: null,
  },
};

export const CurrentTask = { ...baseTask };
export const SelectedTask = { ...baseTask };
export const Tasks = [];
