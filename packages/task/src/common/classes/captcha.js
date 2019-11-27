import { Task, Manager, SiteKeyForPlatform } from '../constants';
import AsyncQueue from './asyncQueue';

const { HarvestStates } = Task;
const { Events } = Manager;

// eslint-disable-next-line import/prefer-default-export
export const getCaptcha = async (context, eventFn, platform) => {
  const { id, events, logger } = context;
  if (context.harvestState === HarvestStates.idle) {
    context.setCaptchaQueue(new AsyncQueue());
    events.on(Events.Harvest, eventFn);
    context.setHarvestState(HarvestStates.start);
  }

  if (context.harvestState === HarvestStates.suspend) {
    context.setHarvestState(HarvestStates.start);
  }

  if (context.harvestState === HarvestStates.start) {
    logger.silly('[DEBUG]: Starting harvest...');
    events.emit(
      Events.StartHarvest,
      id,
      SiteKeyForPlatform[platform],
      'http://www.supremenewyork.com',
      1,
    );
  }

  return context.captchaQueue.next();
};

export const suspendHarvestCaptcha = (context, platform) => {
  const { id, harvestState, logger, events } = context;

  if (harvestState !== HarvestStates.start) {
    return null;
  }

  logger.silly('[DEBUG]: Suspending harvest...');
  events.emit(
    Events.StopHarvest,
    id,
    SiteKeyForPlatform[platform],
    'http://www.supremenewyork.com',
  );
  return context.setHarvestState(HarvestStates.suspend);
};

export const stopHarvestCaptcha = (context, eventFn, platform) => {
  const { id, harvestState, captchaQueue, logger, events } = context;
  if (harvestState === HarvestStates.start || harvestState === HarvestStates.suspend) {
    captchaQueue.destroy();
    context.setCaptchaQueue(null);
    logger.silly('[DEBUG]: Stopping harvest...');
    events.emit(
      Events.StopHarvest,
      id,
      SiteKeyForPlatform[platform],
      'http://www.supremenewyork.com',
    );
    events.removeListener(Events.Harvest, eventFn);
    context.setHarvestState(HarvestStates.stop);
  }
};
