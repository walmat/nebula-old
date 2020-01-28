export const Webhooks = [];
export const CurrentWebhook = {
  id: null,
  name: '',
  url: '',
};

export const Proxies = [];
export const Accounts = [];
export const CurrentAccount = {
  name: '',
  username: '',
  password: '',
};

export const Shipping = {
  product: {
    raw: '',
    variant: null,
    pos: null,
    neg: null,
    url: null,
  },
  store: null,
  profile: null,
  status: 'idle',
};

export const Delays = {
  monitor: 1500,
};
