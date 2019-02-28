/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';
import createMemoryHistory from 'history/createMemoryHistory';
import configureStore from 'redux-mock-store';

import { NavbarPrimitive, mapStateToProps, mapDispatchToProps } from '../../navbar/navbar';
import Bodymovin from '../../navbar/bodymovin';
import { initialNavbarState } from '../../state/reducers/navbar/navbarReducer';
import { ROUTES, NAVBAR_ACTIONS } from '../../state/actions';

describe('<Navbar />', () => {
  let Bridge;
  let history;
  let props;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...props,
      ...customProps,
    };

    return shallow(
      <NavbarPrimitive
        history={renderProps.history}
        navbar={renderProps.navbar}
        onRoute={renderProps.onRoute}
        onKeyPress={renderProps.onKeyPress}
      />,
    );
  };

  const renderWrapperWithLocation = loc => renderShallowWithProps({ navbar: { location: loc } });

  beforeEach(() => {
    history = createMemoryHistory();
    props = {
      history,
      navbar: { ...initialNavbarState },
      onRoute: jest.fn(),
      onKeyPress: jest.fn(),
    };
  });

  afterEach(() => {
    delete global.window.Bridge;
  });

  describe('should render name and version correctly', () => {
    test('when window Bridge is defined', () => {
      Bridge = {
        getAppData: jest.fn(() => ({ name: 'Nebula Orion', version: '1.0.0' })),
      };
      global.window.Bridge = Bridge;
      const wrapper = renderShallowWithProps();
      expect(Bridge.getAppData).toHaveBeenCalled();
      const appName = wrapper.find('.navbar__text--app-name').text();
      const version = wrapper.find('.navbar__text--app-version').text();
      expect(appName).toEqual('Nebula Orion');
      expect(version).toEqual('1.0.0');
    });
    test('when window Bridge is undefined', () => {
      const wrapper = renderShallowWithProps();
      const appName = wrapper.find('.navbar__text--app-name').text();
      const version = wrapper.find('.navbar__text--app-version').text();
      expect(appName).toEqual('Nebula Orion');
      expect(version).toEqual('');
    });
  });

  it('should render with required props', () => {
    const onRoute = jest.fn();
    const wrapper = shallow(
      <NavbarPrimitive history={history} navbar={{ ...initialNavbarState }} onRoute={onRoute} />,
    );
    expect(wrapper.find(NavbarPrimitive)).toBeDefined();
    expect(wrapper.find(Bodymovin)).toBeDefined();
    expect(wrapper.find('.active')).toBeDefined();
    expect(wrapper.find('.active').prop('onKeyPress')()).toBeUndefined();
  });

  describe('should render with only one active icon', () => {
    test('when default location is used', () => {
      const wrapper = renderWrapperWithLocation('/');
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      expect(div.prop('title')).toBe('tasks');
      expect(div.prop('onKeyPress')()).toBeUndefined();
    });

    test('when tasks route is used', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.TASKS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      expect(div.prop('title')).toBe('tasks');
    });

    test('when profiles route is used', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.PROFILES);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      expect(div.prop('title')).toBe('profiles');
    });

    test.skip('when server route is used', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SERVER);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      expect(div.prop('title')).toBe('servers');
    });

    test('when settings route is used', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SETTINGS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      expect(div.prop('title')).toBe('settings');
    });
  });

  describe('should call correct handler when clicking', () => {
    test('task', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.TASKS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onClickHandler = div.prop('onClick');
      expect(onClickHandler).toBeDefined();
      div.simulate('click');
      expect(props.onRoute).toHaveBeenCalledWith(NAVBAR_ACTIONS.ROUTE_TASKS, props.history);
    });

    test('profiles', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.PROFILES);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onClickHandler = div.prop('onClick');
      expect(onClickHandler).toBeDefined();
      div.simulate('click');
      expect(props.onRoute).toHaveBeenCalledWith(NAVBAR_ACTIONS.ROUTE_PROFILES, props.history);
    });

    test('server', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SERVER);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onClickHandler = div.prop('onClick');
      expect(onClickHandler).toBeDefined();
      div.simulate('click');
      expect(props.onRoute).toHaveBeenCalledWith(NAVBAR_ACTIONS.ROUTE_SERVER, props.history);
    });

    test('settings', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SETTINGS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onClickHandler = div.prop('onClick');
      expect(onClickHandler).toBeDefined();
      div.simulate('click');
      expect(props.onRoute).toHaveBeenCalledWith(NAVBAR_ACTIONS.ROUTE_SETTINGS, props.history);
    });
  });

  describe('should respond to onKeyPress', () => {
    test('for task', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.TASKS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onKeyPressHandler = div.prop('onKeyPress');
      expect(onKeyPressHandler).toBeDefined();
      div.simulate('keyPress');
      expect(props.onKeyPress).toHaveBeenCalled();
    });

    test('for profiles', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.PROFILES);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onKeyPressHandler = div.prop('onKeyPress');
      expect(onKeyPressHandler).toBeDefined();
      div.simulate('keyPress');
      expect(props.onKeyPress).toHaveBeenCalled();
    });

    test('for server', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SERVER);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onKeyPressHandler = div.prop('onKeyPress');
      expect(onKeyPressHandler).toBeDefined();
      div.simulate('keyPress');
      expect(props.onKeyPress).toHaveBeenCalled();
    });

    test('for settings', () => {
      const wrapper = renderWrapperWithLocation(ROUTES.SETTINGS);
      const div = wrapper.find('.active');
      expect(div).toHaveLength(1);
      const onKeyPressHandler = div.prop('onKeyPress');
      expect(onKeyPressHandler).toBeDefined();
      div.simulate('keyPress');
      expect(props.onKeyPress).toHaveBeenCalled();
    });
  });

  test('map state to props returns the correct structure', () => {
    const initialState = {
      navbar: { ...initialNavbarState },
    };
    const mockStore = configureStore();
    const store = mockStore(initialState);
    const actual = mapStateToProps(store.getState());
    expect(actual.navbar).toEqual(initialNavbarState);
  });

  test('map dispatch to props returns the correct structure', () => {
    const initialState = {
      navbar: { ...initialNavbarState },
    };
    const store = {
      getState: jest.fn(() => initialState),
      dispatch: jest.fn(),
    };
    const actual = mapDispatchToProps(store.dispatch);
    expect(actual.onRoute).toBeDefined();
    actual.onRoute(NAVBAR_ACTIONS.ROUTE_TASKS, history);
    actual.onRoute(NAVBAR_ACTIONS.ROUTE_PROFILES, history);
    actual.onRoute(NAVBAR_ACTIONS.ROUTE_SERVER, history);
    actual.onRoute(NAVBAR_ACTIONS.ROUTE_SETTINGS, history);
    expect(store.dispatch).toHaveBeenCalledTimes(4);
  });
});
