/* global describe it expect test */
import locationReducer from '../../../../state/reducers/profiles/locationReducer';
import { LOCATION_FIELDS } from '../../../../state/actions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('location reducer', () => {
  it('should return initial state', () => {
    const actual = locationReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.location);
  });

  it('should handle edit first name action', () => {
    const expected = {
      ...initialProfileStates.location,
      firstName: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.FIRST_NAME, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit last name action', () => {
    const expected = {
      ...initialProfileStates.location,
      lastName: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.LAST_NAME, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit address action', () => {
    const expected = {
      ...initialProfileStates.location,
      address: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.ADDRESS, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit apt action', () => {
    const expected = {
      ...initialProfileStates.location,
      apt: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.APT, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit city action', () => {
    const expected = {
      ...initialProfileStates.location,
      city: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.CITY, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit zip code action', () => {
    const expected = {
      ...initialProfileStates.location,
      zipCode: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.ZIP_CODE, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit phone action', () => {
    const expected = {
      ...initialProfileStates.location,
      phone: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.PHONE_NUMBER, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit country action', () => {
    const expected = {
      ...initialProfileStates.location,
      country: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.COUNTRY, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit state action', () => {
    const expected = {
      ...initialProfileStates.location,
      state: 'testing',
    };
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.STATE, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should not respond to invalid action type', () => {
    const actual = locationReducer(
      initialProfileStates.location,
      { type: 'INVALID' },
    );
    expect(actual).toEqual(initialProfileStates.location);
  });

  it('should not respond to an invalid action', () => {
    const actual = locationReducer(
      initialProfileStates.location,
      { type: LOCATION_FIELDS.ADDRESS },
    );
    expect(actual).toEqual(initialProfileStates.location);
  });

  describe('should handle errors', () => {
    const _handleErrorsTest = (type) => {
      const expected = {
        ...initialProfileStates.location,
        errors: 'testing',
      };
      const actual = locationReducer(
        initialProfileStates.location,
        { type, errors: 'testing' },
      );
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

    test('for state action', () => {
      _handleErrorsTest(LOCATION_FIELDS.STATE);
    });
  });
});
