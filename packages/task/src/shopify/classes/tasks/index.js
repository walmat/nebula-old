import SafeTask from './safe';
import DynoTask from './dyno';
import FastTask from './fast';

import { Task as TaskConstants } from '../../constants';

const { Modes } = TaskConstants;

export default type => {
  switch (type) {
    case Modes.DYNO:
      return (...params) => new DynoTask(...params);
    case Modes.FAST:
      return (...params) => new FastTask(...params);
    case Modes.SAFE:
      return (...params) => new SafeTask(...params);
    default:
      return (...params) => new SafeTask(...params);
  }
};
