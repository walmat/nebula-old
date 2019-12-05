import { Monitor } from '../constants';
import { Bases, Constants } from '../../common';

const { States } = Monitor;
const { Platforms } = Constants;
const { BaseMonitor } = Bases;

export default class MonitorPrimitive extends BaseMonitor {
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
