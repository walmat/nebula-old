/* global describe it expect test */
import locationReducer from '../../../../state/reducers/profiles/locationReducer';
import { LOCATION_FIELDS } from '../../../../state/actions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('location reducer', () => {
  it('should return initial state', () => {
    const actual = locationReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.location);
  });

  describe('when editing', () => {
    const _testEditField = field => {
      it('should update when using a non-null value', () => {
        const expected = {
          ...initialProfileStates.location,
          [field]:
            field === LOCATION_FIELDS.PROVINCE ? { value: 'AL', label: 'Alabama' } : 'testing',
        };
        const actual = locationReducer(initialProfileStates.location, {
          type: field,
          value:
            field === LOCATION_FIELDS.PROVINCE
              ? {
                  province: { value: 'AL', label: 'Alabama' },
                  country: { value: 'US', label: 'United States' },
                }
              : 'testing',
        });
        expect(actual).toEqual(expected);
      });

      it('should update when using an empty value', () => {
        const expected = {
          ...initialProfileStates.location,
        };
        const actual = locationReducer(initialProfileStates.location, {
          type: field,
          value: '',
        });
        expect(actual).toEqual(expected);
      });

      it('should clear the state when using a null value', () => {
        const expected = {
          ...initialProfileStates.location,
        };
        const actual = locationReducer(initialProfileStates.location, {
          type: field,
          value: null,
        });
        expect(actual).toEqual(expected);
      });
    };

    describe('first name', () => _testEditField(LOCATION_FIELDS.FIRST_NAME));

    describe('last name', () => _testEditField(LOCATION_FIELDS.LAST_NAME));

    describe('address', () => _testEditField(LOCATION_FIELDS.ADDRESS));

    describe('apt', () => _testEditField(LOCATION_FIELDS.APT));

    describe('city', () => _testEditField(LOCATION_FIELDS.CITY));

    describe('zip code', () => _testEditField(LOCATION_FIELDS.ZIP_CODE));

    describe('phone number', () => _testEditField(LOCATION_FIELDS.PHONE_NUMBER));

    describe('province', () => _testEditField(LOCATION_FIELDS.PROVINCE));

    describe('country', () => _testEditField(LOCATION_FIELDS.COUNTRY));
  });

  it('should not respond to invalid action type', () => {
    const actual = locationReducer(initialProfileStates.location, {
      type: 'INVALID',
    });
    expect(actual).toEqual(initialProfileStates.location);
  });

  it('should not respond to an invalid action', () => {
    const actual = locationReducer(initialProfileStates.location, {
      type: LOCATION_FIELDS.ADDRESS,
    });
    expect(actual).toEqual(initialProfileStates.location);
  });

  describe('should handle errors', () => {
    const _handleErrorsTest = type => {
      const expected = {
        ...initialProfileStates.location,
        errors: 'testing',
      };
      const actual = locationReducer(initialProfileStates.location, {
        type,
        errors: 'testing',
      });
      expect(actual).toEqual(expected);
    };

    test('for first name action', () => {
      _handleErrorsTest(LOCATION_FIELDS.FIRST_NAME);
    });

    test('for last name action', () => {
      _handleErrorsTest(LOCATION_FIELDS.LAST_NAME);
    });

    test('for address action', () => {
      _handleErrorsTest(LOCATION_FIELDS.ADDRESS);
    });

    test('for apt action', () => {
      _handleErrorsTest(LOCATION_FIELDS.APT);
    });

    test('for city action', () => {
      _handleErrorsTest(LOCATION_FIELDS.CITY);
    });

    test('for zip code action', () => {
      _handleErrorsTest(LOCATION_FIELDS.ZIP_CODE);
    });

    test('for country action', () => {
      _handleErrorsTest(LOCATION_FIELDS.COUNTRY);
    });

    test('for province action', () => {
      _handleErrorsTest(LOCATION_FIELDS.PROVINCE);
    });
  });
});
