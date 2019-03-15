/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.0.0';
import initialState from '../../../state/migrators/v0.0.0/state';

describe('v0.0.0 migrator', () => {
  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should pass through state if given', () => {
    const initial = { initial: true };
    const migrated = migrator(initial);
    expect(migrated).toEqual(initial);
  });
});
