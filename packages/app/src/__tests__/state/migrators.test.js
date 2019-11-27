/* global describe it test expect jest */
import topLevelMigrator from '../../state/migrators';

describe('top level migrator', () => {
  describe('migrator logic', () => {
    it('should use version 0.0.0 to start migrating if no version exists in the state', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
      };
      const migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
    });

    it('should use the given version to migrate when state with version is given', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
        '0.2.0': jest.fn(() => ({ version: '0.2.0' })),
      };
      const migrated = topLevelMigrator({ version: '0.1.0' }, migrators);
      expect(migrated).toEqual({ version: '0.2.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should use the last migrator to construct the state if no state is given', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
      };
      let migrated = topLevelMigrator(undefined, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);

      Object.values(migrators).forEach(m => m.mockClear());

      migrators['0.2.0'] = jest.fn(() => ({ version: '0.2.0' }));
      migrated = topLevelMigrator(undefined, migrators);
      expect(migrated).toEqual({ version: '0.2.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the start index does not exist in the given migrator map', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
      };
      expect(() => topLevelMigrator({ version: '0.2.0' }, migrators)).toThrow();
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();
    });

    it('should run the starting version migrator if version 0.0.0 is used', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
      };
      const migrated = topLevelMigrator({ version: '0.0.0' }, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
    });

    it("should bypass the current version's migrator if it is not the starting version", () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
        '0.1.1': jest.fn(() => ({ version: '0.1.1' })),
        '0.2.0': jest.fn(() => ({ version: '0.2.0' })),
      };
      const migrated = topLevelMigrator({ version: '0.1.0' }, migrators);
      expect(migrated).toEqual({ version: '0.2.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.1']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should call migrators in semver order regardless of how they are inserted into the migrator map', () => {
      const migrators = {
        '0.1.0': jest.fn(() => ({ version: '0.1.0' })),
        '0.0.0': jest.fn(() => ({ version: '0.0.0' })),
      };
      expect(() => topLevelMigrator({ version: '0.2.0' }, migrators)).toThrow();
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();

      let migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      Object.values(migrators).forEach(m => m.mockClear());

      migrators['0.0.1'] = jest.fn(() => ({ version: '0.0.1' }));
      migrated = topLevelMigrator({ version: '0.0.0' }, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.0.1']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      Object.values(migrators).forEach(m => m.mockClear());

      migrated = topLevelMigrator({ version: '0.0.1' }, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.0.1']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      Object.values(migrators).forEach(m => m.mockClear());

      migrated = topLevelMigrator(null, migrators);
      expect(migrated).toEqual({ version: '0.1.0' });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.0.1']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
    });

    it('should allow cascading additions to the state object', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({})),
        '0.1.0': jest.fn(state => ({ ...state, version: '0.1.0', add: 'property' })),
        '0.2.0': jest.fn(state => ({ ...state, version: '0.2.0', add2: 'property' })),
      };
      const migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({
        version: '0.2.0',
        add: 'property',
        add2: 'property',
      });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should allow cascading deletions to the state object', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ delete1: 'property', delete2: 'property' })),
        '0.1.0': jest.fn(state => {
          const returnState = { ...state, version: '0.1.0' };
          delete returnState.delete1;
          return returnState;
        }),
        '0.2.0': jest.fn(state => {
          const returnState = { ...state, version: '0.2.0' };
          delete returnState.delete2;
          return returnState;
        }),
      };
      const migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({ version: '0.2.0' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should allow both additions and deletions to the state object', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ delete1: 'property' })),
        '0.1.0': jest.fn(state => {
          const returnState = { ...state, version: '0.1.0', add1: 'property', add2: 'property' };
          delete returnState.delete1;
          return returnState;
        }),
        '0.2.0': jest.fn(state => {
          const returnState = { ...state, version: '0.2.0', add3: 'property' };
          delete returnState.add1;
          return returnState;
        }),
      };
      const migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({ version: '0.2.0', add2: 'property', add3: 'property' });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });

    it('should allow passthrough of properties and conditional additions/deletions to the state object', () => {
      const migrators = {
        '0.0.0': jest.fn(() => ({ prop: 'property' })),
        '0.1.0': jest.fn(state => {
          const returnState = { ...state, version: '0.1.0', add1: 'property', add2: 'property' };
          return returnState;
        }),
        '0.1.1': jest.fn(state => {
          const returnState = { ...state, version: '0.1.1', prop: state.prop || 'default' };
          return returnState;
        }),
        '0.1.2': jest.fn(state => {
          const returnState = { ...state, version: '0.1.2' };
          if (returnState.prop === 'default') {
            returnState.defaulted = true;
          }
          return returnState;
        }),
        '0.2.0': jest.fn(state => {
          const returnState = { ...state, version: '0.2.0', add3: 'property' };
          delete returnState.add1;
          if (returnState.defaulted) {
            delete returnState.add2;
          }
          return returnState;
        }),
      };
      let migrated = topLevelMigrator({}, migrators);
      expect(migrated).toEqual({
        version: '0.2.0',
        add2: 'property',
        add3: 'property',
        prop: 'property',
      });
      expect(migrators['0.0.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.0']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.1']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.2']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
      Object.values(migrators).forEach(m => m.mockClear());

      migrated = topLevelMigrator(
        {
          version: '0.1.0',
          add1: 'property',
          add2: 'property',
        },
        migrators,
      );
      expect(migrated).toEqual({
        version: '0.2.0',
        prop: 'default',
        defaulted: true,
        add3: 'property',
      });
      expect(migrators['0.0.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.0']).not.toHaveBeenCalled();
      expect(migrators['0.1.1']).toHaveBeenCalledTimes(1);
      expect(migrators['0.1.2']).toHaveBeenCalledTimes(1);
      expect(migrators['0.2.0']).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrator compatibility', () => {});
});
