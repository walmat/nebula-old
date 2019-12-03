import { Types, States } from '../../../constants/tasks';

export const task = {
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
  amount: 1,
  state: States.Stopped,
  message: '',
};

export const CurrentTask = { ...task };
export const SelectedTask = { ...task };
export const Tasks = [];
