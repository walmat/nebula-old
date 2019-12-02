import { Types } from '../../../constants/tasks';

export const task = {
  id: null,
  site: null,
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
  amount: 0,
  status: 'idle',
  message: '',
};

export const CurrentTask = { ...task };
export const SelectedTask = { ...task };
export const Tasks = [];
