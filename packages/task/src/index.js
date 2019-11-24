import { setLevels } from './common/logger';
import TaskManager from './taskManager';
import { Task } from './shopify/utils/constants';

const { Types: TaskTypes } = Task;

export { setLevels, TaskManager, TaskTypes };
