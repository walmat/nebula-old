import SafeTask from './safe';
import DynoTask from './dyno';
import FastTask from './fast';

import { Task as TaskConstants } from '../../constants';

const { Modes } = TaskConstants;

export default (type, url) => {
  switch (type) {
    case Modes.DYNO:
      return (...params) => new DynoTask(...params);
    case Modes.FAST:
      if (/eflash-us|eflash-uk|palace/i.test(url)) {
        return (...params) => new SafeTask(...params);
      }
      return (...params) => new FastTask(...params);
    case Modes.SAFE:
      return (...params) => new SafeTask(...params);
    default:
      return (...params) => new SafeTask(...params);
  }
};
