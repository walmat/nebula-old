import { generate } from 'shortid';

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
