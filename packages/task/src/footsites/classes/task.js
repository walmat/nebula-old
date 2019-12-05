import { Task } from '../constants';
import { Bases, Constants } from '../../common';

const { States } = Task;
const { Platforms } = Constants;
const { BaseTask } = Bases;

export default class TaskPrimitive extends BaseTask {
  constructor(context, platform = Platforms.Footsites) {
    super(context, platform);
  }

  // todo.. handler functions here

  async _handleStepLogic(currentState) {
    const { logger } = this._context;

    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      // ... map state to handler function here
      [States.SWAP]: this._handleSwapProxies,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
