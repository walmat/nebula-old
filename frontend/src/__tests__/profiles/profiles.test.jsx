/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { ProfilesPrimitive, mapStateToProps, mapDispatchToProps } from '../../profiles/profiles';
import { PROFILE_FIELDS, profileActions } from '../../state/actions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import LocationFields from '../../profiles/locationFields';
import PaymentFields from '../../profiles/paymentFields';

describe('<Profiles />', () => {
  let defaultProps;

  const renderShallowWithProps = (customProps) => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(<ProfilesPrimitive
      profiles={renderProps.profiles}
      currentProfile={renderProps.currentProfile}
      selectedProfile={renderProps.selectedProfile}
      onClickBillingMatchesShipping={renderProps.onClickBillingMatchesShipping}
      onProfileNameChange={renderProps.onProfileNameChange}
      onAddNewProfile={renderProps.onAddNewProfile}
      onLoadProfile={renderProps.onLoadProfile}
      onDestroyProfile={renderProps.onDestroyProfile}
      onSelectProfile={renderProps.onSelectProfile}
      onUpdateProfile={renderProps.onUpdateProfile}
      onKeyPress={renderProps.onKeyPress}
    />);
  };

  beforeEach(() => {
    defaultProps = {
      profiles: initialProfileStates.list,
      currentProfile: initialProfileStates.profile,
      selectedProfile: initialProfileStates.profile,
      onClickBillingMatchesShipping: () => {},
      onProfileNameChange: () => {},
      onAddNewProfile: () => {},
      onLoadProfile: () => {},
      onDestroyProfile: () => {},
      onSelectProfile: () => {},
      onUpdateProfile: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.container')).toHaveLength(1);
    expect(wrapper.find('#profile-load')).toHaveLength(1);
    expect(wrapper.find('#load-profile')).toHaveLength(1);
    expect(wrapper.find('#billing-match-shipping')).toHaveLength(1);
    expect(wrapper.find(LocationFields)).toHaveLength(2);
    expect(wrapper.find(PaymentFields)).toHaveLength(1);
    expect(wrapper.find('#profile-save')).toHaveLength(1);
    expect(wrapper.find('#submit-profile')).toHaveLength(1);
    expect(wrapper.find('#delete-profile')).toHaveLength(1);
    wrapper.find('#billing-match-shipping').parent().simulate('keyPress');
  });

  describe('should render correct values for', () => {
    test('profile selection list', () => {
      const customProps = {
        profiles: [1, 2, 3].map(id => ({
          ...initialProfileStates.profile,
          id,
          profileName: `profile${id}`,
        })),
        selectedProfile: {
          ...initialProfileStates,
          id: 1,
          profileName: 'profile1',
        },
      };
      const expectedOptions = customProps.profiles.map(p => ({
        value: p.id,
        label: p.profileName,
      }));
      const expectedSelectedOption = { value: 1, label: 'profile1' };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('#profile-load');
      expect(profileSelector.prop('value')).toEqual(expectedSelectedOption);
      expect(profileSelector.prop('options')).toEqual(expectedOptions);
    });

    test('shipping location fields', () => {
      const customProps = {
        currentProfile: {
          ...initialProfileStates.profile,
          profileName: 'currentProfile',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const shippingFields = wrapper.find('#shipping');
      expect(shippingFields.is(LocationFields)).toBeTruthy();
      expect(shippingFields.prop('profileToEdit')).toBe(customProps.currentProfile);
      expect(shippingFields.prop('fieldToEdit')).toBe(PROFILE_FIELDS.EDIT_SHIPPING);
      expect(shippingFields.prop('disabled')).toBeFalsy();
    });

    describe('billing matches shipping field', () => {
      test('when true', () => {
        const customProps = {
          currentProfile: {
            ...initialProfileStates.profile,
            billingMatchesShipping: true,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        const checkbox = wrapper.find('#billing-match-shipping');
        expect(checkbox.prop('alt')).toBe('Billing Matches Shipping');
      });

      test('when false', () => {
        const customProps = {
          currentProfile: {
            ...initialProfileStates.profile,
            billingMatchesShipping: false,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        const checkbox = wrapper.find('#billing-match-shipping');
        expect(checkbox.prop('alt')).toBe('Billing does not Match Shipping');
      });
    });

    describe('billing location fields', () => {
      test('when billing matches shipping', () => {
        const customProps = {
          currentProfile: {
            ...initialProfileStates.profile,
            profileName: 'currentProfile',
            billingMatchesShipping: true,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        const billingFields = wrapper.find('#billing');
        expect(billingFields.is(LocationFields)).toBeTruthy();
        expect(billingFields.prop('profileToEdit')).toBe(customProps.currentProfile);
        expect(billingFields.prop('fieldToEdit')).toBe(PROFILE_FIELDS.EDIT_SHIPPING);
        expect(billingFields.prop('disabled')).toBeTruthy();
      });

      test('when billing doesn\'t match shipping', () => {
        const customProps = {
          currentProfile: {
            ...initialProfileStates.profile,
            profileName: 'currentProfile',
            billingMatchesShipping: false,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        const billingFields = wrapper.find('#billing');
        expect(billingFields.is(LocationFields)).toBeTruthy();
        expect(billingFields.prop('profileToEdit')).toBe(customProps.currentProfile);
        expect(billingFields.prop('fieldToEdit')).toBe(PROFILE_FIELDS.EDIT_BILLING);
        expect(billingFields.prop('disabled')).toBeFalsy();
      });
    });

    test('payment fields', () => {
      const customProps = {
        currentProfile: { ...initialProfileStates.profile },
      };
      const wrapper = renderShallowWithProps(customProps);
      const paymentFields = wrapper.find('#payment');
      expect(paymentFields.is(PaymentFields)).toBeTruthy();
      expect(paymentFields.prop('profileToEdit')).toBe(customProps.currentProfile);
    });

    test('profile name field', () => {
      const customProps = {
        currentProfile: {
          ...initialProfileStates.profile,
          profileName: 'currentProfile',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileName = wrapper.find('#profile-save');
      expect(profileName.prop('value')).toBe('currentProfile');
    });
  });

  describe('should call correct event handler when', () => {
    test('selecting a different profile', () => {
      const customProps = {
        profiles: [1, 2, 3].map(id => ({
          ...initialProfileStates.profile,
          id,
          profileName: `profile${id}`,
        })),
        selectedProfile: {
          ...initialProfileStates,
          id: 1,
          profileName: 'profile1',
        },
        onSelectProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('#profile-load');
      profileSelector.simulate('change', { value: 2 });
      expect(customProps.onSelectProfile).toHaveBeenCalledWith(customProps.profiles[1]);
    });

    test('loading the selected profile', () => {
      const customProps = {
        profiles: [1, 2, 3].map(id => ({
          ...initialProfileStates.profile,
          id,
          profileName: `profile${id}`,
        })),
        selectedProfile: {
          ...initialProfileStates,
          id: 1,
          profileName: 'profile1',
        },
        onLoadProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileLoader = wrapper.find('#load-profile');
      profileLoader.simulate('click');
      expect(customProps.onLoadProfile).toHaveBeenCalledWith(customProps.selectedProfile);
    });

    test('clicking the billing matches shipping box', () => {
      const customProps = {
        currentProfile: {
          ...initialProfileStates.profile,
        },
        onClickBillingMatchesShipping: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const checkbox = wrapper.find('#billing-match-shipping');
      const div = checkbox.parent();
      expect(div.prop('role')).toBe('button');
      div.simulate('click');
      expect(customProps.onClickBillingMatchesShipping).toHaveBeenCalled();
    });

    test('editing the profile name', () => {
      const customProps = {
        currentProfile: {
          ...initialProfileStates.profile,
          profileName: 'currentProfile',
        },
        onProfileNameChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileField = wrapper.find('#profile-save');
      const expectedEvent = { target: { value: 'test' } };
      profileField.simulate('change', expectedEvent);
      expect(customProps.onProfileNameChange).toHaveBeenCalledWith(expectedEvent);
    });

    describe('saving a profile', () => {
      const testSaving = (customProps) => {
        const wrapper = renderShallowWithProps(customProps);
        const submitProfile = wrapper.find('#submit-profile');
        const event = { preventDefault: jest.fn() };
        submitProfile.simulate('click', event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(customProps.onAddNewProfile).toHaveBeenCalledWith(customProps.currentProfile);
      };

      test('when it hasn\'t been loaded before', () => {
        const customProps = {
          currentProfile: {
            ...initialProfileStates.profile,
            profileName: 'currentProfile',
          },
          onAddNewProfile: jest.fn(),
        };
        testSaving(customProps);
      });

      test('when it has been loaded before', () => {
        const customProps = {
          profiles: [1, 2, 3].map(id => ({
            ...initialProfileStates.profile,
            id,
            profileName: `profile${id}`,
          })),
          currentProfile: {
            ...initialProfileStates.profile,
            profileName: 'currentProfile',
            editId: 4,
          },
          onAddNewProfile: jest.fn(),
        };
        testSaving(customProps);
      });

      test('when copying a profile to a new name', () => {
        const customProps = {
          profiles: [1, 2, 3].map(id => ({
            ...initialProfileStates.profile,
            id,
            profileName: `profile${id}`,
          })),
          currentProfile: {
            ...initialProfileStates.profile,
            profileName: 'currentProfile',
            editId: 1,
          },
          onAddNewProfile: jest.fn(),
        };
        testSaving(customProps);
      });
    });

    test('updating an existing profile', () => {
      const customProps = {
        profiles: [1, 2, 3].map(id => ({
          ...initialProfileStates.profile,
          id,
          profileName: `profile${id}`,
        })),
        currentProfile: {
          ...initialProfileStates.profile,
          profileName: 'profile1',
          billingMatchesShipping: true,
          editId: 1,
        },
        onUpdateProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const submitProfile = wrapper.find('#submit-profile');
      const event = { preventDefault: jest.fn() };
      submitProfile.simulate('click', event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(customProps.onUpdateProfile).toHaveBeenCalledWith(customProps.currentProfile);
    });

    test('deleting a profile', () => {
      const customProps = {
        selectedProfile: {
          ...initialProfileStates,
          id: 1,
          profileName: 'profile1',
        },
        onDestroyProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileDeleter = wrapper.find('#delete-profile');
      const event = { preventDefault: jest.fn() };
      profileDeleter.simulate('click', event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(customProps.onDestroyProfile).toHaveBeenCalledWith(customProps.selectedProfile);
    });
  });

  test('responds to a key press event', () => {
    const keyPressHandler = jest.fn();
    const customProps = {
      onKeyPress: keyPressHandler,
    };
    const wrapper = renderShallowWithProps(customProps);
    const checkbox = wrapper.find('#billing-match-shipping');
    const div = checkbox.parent();
    div.simulate('keyPress');
    expect(keyPressHandler).toHaveBeenCalled();
  });

  test('map state to props returns correct structure', () => {
    const state = {
      profiles: [1, 2, 3].map(id => ({
        ...initialProfileStates.profile,
        id,
      })),
      currentProfile: {
        ...initialProfileStates.profile,
      },
      selectedProfile: {
        ...initialProfileStates.profile,
      },
      other: 'stuff',
      that: 'should\'t',
      be: 'in',
      map: 'structure',
    };
    const expected = {
      profiles: state.profiles,
      currentProfile: state.currentProfile,
      selectedProfile: state.selectedProfile,
    };
    const actual = mapStateToProps(state);
    expect(actual).toEqual(expected);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const tempProfile = {
      ...initialProfileStates.profile,
      id: 1,
      editId: 1,
    };
    const expectedActions = [
      profileActions.edit(null, PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING),
      profileActions.edit(null, PROFILE_FIELDS.EDIT_NAME, 'test'),
      profileActions.add(tempProfile),
      profileActions.load(tempProfile),
      profileActions.remove(1),
      profileActions.select(tempProfile),
      profileActions.update(1, tempProfile),
    ];
    const actual = mapDispatchToProps(dispatch);
    actual.onClickBillingMatchesShipping();
    actual.onProfileNameChange({ target: { value: 'test' } });
    actual.onAddNewProfile(tempProfile);
    actual.onLoadProfile(tempProfile);
    actual.onDestroyProfile(tempProfile);
    actual.onSelectProfile(tempProfile);
    actual.onUpdateProfile(tempProfile);

    expect(dispatch).toHaveBeenCalledTimes(7);
    expectedActions.forEach((action, n) => {
      expect(dispatch).toHaveBeenNthCalledWith(
        n + 1,
        typeof action !== 'function' ? action : expect.any(Function),
      );
    });
  });
});
