import { Types, States, Platforms } from '../../../constants';

export const CurrentTask = {
  id: null,
  store: null,
  platform: Platforms.Shopify,
  type: Types.SAFE,
  product: {
    raw: '',
    variant: null,
    variation: '',
    randomInStock: false,
    pos: null,
    neg: null,
    url: null,
  },
  schedule: null,
  checkoutDelay: 0,
  oneCheckout: false,
  restockMode: false,
  category: null,
  captcha: false,
  profile: null,
  size: null,
  account: null,
  state: States.Stopped,
  message: '',
  amount: 1,
  selected: false,
};
export const Tasks = [];
