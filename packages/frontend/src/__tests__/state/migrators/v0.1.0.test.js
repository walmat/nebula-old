/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.1.0';
import initialState from '../../../state/migrators/v0.1.0/state';

describe('v0.1.0 migrator', () => {
  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should attach version if not already given', () => {
    const initial = { initial: true };
    const migrated = migrator(initial);
    expect(migrated).toEqual({
      ...initial,
      version: '0.1.0',
    });
  });

  it('should passthrough version if already given', () => {
    const initial = { initial: true, version: '0.2.0' };
    const migrated = migrator(initial);
    expect(migrated).toEqual(initial);
  });
});
