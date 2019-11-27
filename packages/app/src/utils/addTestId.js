// TODO: Figure out a better way to do this
const _shouldAddTestId =
  process.env.NODE_ENV === 'test' || process.env.NEBULA_ENV === 'test' || process.env.CI;

const addTestId = testId => (_shouldAddTestId ? testId : undefined);
export default addTestId;
