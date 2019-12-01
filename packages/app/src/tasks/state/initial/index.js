export const task = {
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
};

export const CurrentTask = { ...task };
export const SelectedTask = { ...task };
export const Tasks = [];
