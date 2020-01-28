import { Task, Manager, SiteKeyForPlatform, HostForPlatform } from '../constants';
import AsyncQueue from './asyncQueue';

const { HarvestStates } = Task;
const { Events } = Manager;

// eslint-disable-next-line import/prefer-default-export
export const getCaptcha = async (context, eventFn, platform, checkpoint) => {
  const { id, events, logger } = context;
  if (context.harvestState === HarvestStates.idle) {
    logger.error('IDLE state for: %s', id);
    context.setCaptchaQueue(new AsyncQueue());
    events.on(Events.Harvest, eventFn);
    context.setHarvestState(HarvestStates.start);
  }

  if (context.harvestState === HarvestStates.suspend) {
    logger.error('SUSPEND state for: %s', id);
    context.setHarvestState(HarvestStates.start);
  }

  if (context.harvestState === HarvestStates.start) {
    logger.error('START state for: %s', id);
    logger.debug(checkpoint);
    events.emit(
      Events.StartHarvest,
      id,
      context.task.store.sitekey || SiteKeyForPlatform[platform],
      HostForPlatform[platform],
      checkpoint,
      context.task.store.sParam,
    );
  }

  return context.captchaQueue.next();
};

export const suspendHarvestCaptcha = (context, platform) => {
  const { id, harvestState, logger, events } = context;

  if (harvestState !== HarvestStates.start) {
    return null;
  }

  logger.error('Suspending harvest for: %s', id);
  events.emit(
    Events.StopHarvest,
    id,
    context.task.store.sitekey || SiteKeyForPlatform[platform],
    HostForPlatform[platform],
  );
  return context.setHarvestState(HarvestStates.suspend);
};

export const stopHarvestCaptcha = (context, eventFn, platform) => {
  const { id, harvestState, captchaQueue, logger, events } = context;

  logger.error('Stopping harvest for: %s', id);
  if (harvestState === HarvestStates.start || harvestState === HarvestStates.suspend) {
    captchaQueue.destroy();
    context.setCaptchaQueue(null);
    logger.silly('[DEBUG]: Stopping harvest...');
    events.emit(
      Events.StopHarvest,
      id,
      context.task.store.sitekey || SiteKeyForPlatform[platform],
      HostForPlatform[platform],
    );
    events.removeListener(Events.Harvest, eventFn);
    context.setHarvestState(HarvestStates.stop);
  }
};
