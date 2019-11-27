import Task from './classes/task';
import Monitor from './classes/monitor';
import RateFetcher from './classes/rateFetcher';
import { Discord, Slack } from './hooks';
import { Task as T, Monitor as M } from './constants';

const { Types: TaskTypes, HookTypes } = T;
const { ParseType } = M;

export { Task, Monitor, RateFetcher, Discord, Slack, TaskTypes, HookTypes, ParseType };
