import { generate } from 'shortid';
import { parseURL } from 'whatwg-url';

export const Types = {
  SAFE: 'SAFE',
  FAST: 'FAST',
};

export const States = {
  Running: 'RUNNING',
  Stopped: 'STOPPED',
};

export const _getId = list => {
  let id;

  const idCheck = tasks => tasks.some(t => t.id === id);

  do {
    id = generate();
  } while (idCheck(list));

  return { id };
};

export const createStore = value => {
  const URL = parseURL(value);
  if (!URL || !URL.host) {
    return null;
  }
  return { name: URL.host, url: `${URL.scheme}://${URL.host}` };
};

export const createSize = value => (!value ? null : value);

export const mapTypeToNextType = type => {
  switch (type) {
    case Types.SAFE:
      return Types.FAST;
    case Types.FAST:
      return Types.SAFE;
    default:
      return Types.SAFE;
  }
};
