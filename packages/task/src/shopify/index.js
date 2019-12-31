import chooseTask from './classes/tasks';
import Monitor from './classes/monitor';
import RateFetcher from './classes/rateFetcher';
import { Task as T, Monitor as M } from './constants';

const { Types: TaskTypes, HookTypes } = T;
const { ParseType } = M;

export { chooseTask, Monitor, RateFetcher, TaskTypes, HookTypes, ParseType };
