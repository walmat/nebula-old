/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  LoadProfilePrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../profiles/loadProfile';
import { profileActions } from '../../state/actions';
import initialProfileStates from '../../state/initial/profiles';
import { initialState } from '../../state/migrators';

describe('<LoadProfile />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <LoadProfilePrimitive
        theme={renderProps.theme}
        profiles={renderProps.profiles}
        selectedProfile={renderProps.selectedProfile}
        onLoadProfile={renderProps.onLoadProfile}
        onSelectProfile={renderProps.onSelectProfile}
        onDestroyProfile={renderProps.onDestroyProfile}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      theme: initialState.theme,
      profiles: initialProfileStates.list,
      selectedProfile: initialProfileStates.profile,
      onLoadProfile: () => {},
      onSelectProfile: () => {},
      onDestroyProfile: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.profiles-load__input-group--select')).toHaveLength(1);
    expect(wrapper.find('.profiles-load__input-group--load')).toHaveLength(1);
    expect(wrapper.find('.profiles-load__input-group--delete')).toHaveLength(1);
  });

  it('test profile selection list', () => {
    const customProps = {
      profiles: [1, 2, 3].map(id => ({
        ...initialProfileStates.profile,
        id,
        profileName: `profile${id}`,
      })),
      selectedProfile: {
        ...initialProfileStates.profile,
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
    const profileSelector = wrapper.find('.profiles-load__input-group--select');
    expect(profileSelector.prop('value')).toEqual(expectedSelectedOption);
    expect(profileSelector.prop('options')).toEqual(expectedOptions);
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
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'profile1',
        },
        onSelectProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('.profiles-load__input-group--select');
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
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'profile1',
        },
        onLoadProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileLoader = wrapper.find('.profiles-load__input-group--load');
      profileLoader.simulate('click');
      expect(customProps.onLoadProfile).toHaveBeenCalledWith(customProps.selectedProfile);
    });

    test('deleting a profile', () => {
      const customProps = {
        selectedProfile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'profile1',
        },
        onDestroyProfile: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileDeleter = wrapper.find('.profiles-load__input-group--delete');
      const event = { preventDefault: jest.fn() };
      profileDeleter.simulate('click', event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(customProps.onDestroyProfile).toHaveBeenCalledWith(customProps.selectedProfile);
    });
  });

  test('map state to props returns correct structure', () => {
    const state = {
      profiles: [1, 2, 3].map(id => ({
        ...initialProfileStates.profile,
        id,
        profileName: `profile${id}`,
      })),
      selectedProfile: {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'profile1',
      },
      theme: initialState.theme,
    };
    const actual = mapStateToProps(state);
    expect(actual.profiles).toEqual(state.profiles);
    expect(actual.theme).toEqual(state.theme);
    expect(actual.selectedProfile).toEqual(state.selectedProfile);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const tempProfile = {
      ...initialProfileStates.profile,
      id: 1,
      editId: 1,
    };
    const expectedActions = [
      profileActions.load(tempProfile),
      profileActions.remove(1),
      profileActions.select(tempProfile),
    ];
    const actual = mapDispatchToProps(dispatch);
    actual.onLoadProfile(tempProfile);
    actual.onDestroyProfile(tempProfile);
    actual.onSelectProfile(tempProfile);

    expect(dispatch).toHaveBeenCalledTimes(3);
    expectedActions.forEach((action, n) => {
      expect(dispatch).toHaveBeenNthCalledWith(
        n + 1,
        typeof action !== 'function' ? action : expect.any(Function),
      );
    });
  });
});
