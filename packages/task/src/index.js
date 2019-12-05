import { Utils } from './common';
import TaskManager from './manager';
import { Task } from './shopify/constants';

const { setLevels } = Utils;
const { Types: TaskTypes } = Task;

export { setLevels, TaskManager, TaskTypes };
