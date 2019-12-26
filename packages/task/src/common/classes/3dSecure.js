import { Task, Manager } from '../constants';
import AsyncQueue from './asyncQueue';

const { SecureStates } = Task;
const { Events } = Manager;

// eslint-disable-next-line import/prefer-default-export
export const getSecure = async (context, eventFn) => {
  const { id, events, logger } = context;
  if (context.secureState === SecureStates.idle) {
    context.setCaptchaQueue(new AsyncQueue());
    events.on(Events.Secure, eventFn);
    context.setSecureState(SecureStates.start);
  }

  if (context.secureState === SecureStates.start) {
    logger.silly('[DEBUG]: Starting secure...');
    events.emit(Events.StartSecure, id);
  }

  return context.secureQueue.next();
};

export const stopSecure = (context, eventFn) => {
  const { id, secureState, secureQueue, logger, events } = context;
  if (secureState === SecureStates.start) {
    secureQueue.destroy();
    context.setSecureQueue(null);
    logger.silly('[DEBUG]: Stopping secure...');
    events.emit(Events.StopSecure, id);
    events.removeListener(Events.Secure, eventFn);
    context.setSecureState(SecureStates.stop);
  }
};
