import { Types, States } from '../../../constants/tasks';

export const CurrentTask = {
  id: null,
  store: null,
  type: Types.SAFE,
  product: {
    raw: '',
    variant: null,
    pos: null,
    neg: null,
    url: null,
  },
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
