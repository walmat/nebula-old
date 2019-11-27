/* global describe it test expect jest */
import migrator from '../../../state/migrators/v0.2.1';
import initialState from '../../../state/migrators/v0.2.1/state';
import prevState from '../../../state/migrators/v0.2.0/state';

describe('v0.2.1 migrator', () => {
  it('should return initial state if no state is given', () => {
    const migrated = migrator();
    expect(migrated).toEqual(initialState);
  });

  it('should update lower versions', () => {
    const start = {
      ...initialState,
      version: '0.2.0',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(initialState);
  });

  it('should not update higher versions', () => {
    const start = {
      ...initialState,
      version: '0.3.0',
    };
    const migrated = migrator(start);
    expect(migrated).toEqual(start);
  });

  it('should add shipping status if not present', () => {
    const start = { ...prevState };
    const migrated = migrator(start);
    expect(migrated.settings.shipping.status).toBe('idle');
    expect(migrated).toEqual(initialState);
  });

  it('should not change shipping status if it is present', () => {
    const start = { ...initialState };
    start.settings.shipping.status = 'inprogress';
    const migrated = migrator(start);
    expect(migrated.settings.shipping.status).toBe('inprogress');
    expect(migrated).toEqual(start);
  });
});
