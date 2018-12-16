/* global describe it test beforeEach afterEach expect jest */
import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';

import createApp, { App } from '../app';
import Navbar from '../navbar/navbar';
import Tasks from '../tasks/tasks';
import Profiles from '../profiles/profiles';
import Server from '../server/server';
import Settings from '../settings/settings';
import { ROUTES, globalActions } from '../state/actions';

import getByTestId from '../__testUtils__/getByTestId';

describe('Top Level App', () => {
  let defaultProps;

  const testApp = appProvider => {
    it('should render with initial props', () => {
      const wrapper = appProvider();
      expect(wrapper.find(Navbar)).toHaveLength(1);
      expect(wrapper.find(Provider)).toHaveLength(1);
      expect(wrapper.find(BrowserRouter)).toHaveLength(1);
      expect(wrapper.find(Switch)).toHaveLength(1);
      expect(wrapper.find(Route)).toHaveLength(5);
      expect(wrapper.find(Tasks)).toHaveLength(0);
      expect(wrapper.find(Profiles)).toHaveLength(0);
      expect(wrapper.find(Server)).toHaveLength(0);
      expect(wrapper.find(Settings)).toHaveLength(0);
      expect(wrapper.find('#container-wrapper')).toHaveLength(1);
      expect(getByTestId(wrapper, 'App.button.close')).toHaveLength(1);
      expect(getByTestId(wrapper, 'App.button.deactivate')).toHaveLength(1);
      getByTestId(wrapper, 'App.button.deactivate').simulate('keyPress');
      expect(wrapper.instance().props.store.getState).toHaveBeenCalled();
      wrapper.unmount();
    });

    describe('Deactivate Button', () => {
      let Bridge;

      afterEach(() => {
        if (Bridge && window.Bridge) {
          delete window.Bridge;
        }
      });

      it('should render with correct props', () => {
        const wrapper = appProvider();
        const deactivateButton = getByTestId(wrapper, 'App.button.deactivate');
        expect(deactivateButton.prop('className')).toBe('close-area-1');
        expect(deactivateButton.prop('role')).toBe('button');
        expect(deactivateButton.prop('title')).toBe('deactivate');
        expect(deactivateButton.prop('onKeyPress')).toBeDefined();
        expect(deactivateButton.prop('onClick')).toBeDefined();
      });

      it("should not call window bridge methods if bridge isn't defined", () => {
        const onKeyPress = jest.fn();
        const wrapper = appProvider({ onKeyPress });
        const deactivateButton = getByTestId(wrapper, 'App.button.deactivate');
        const ev = {
          preventDefault: jest.fn(),
        };
        deactivateButton.simulate('click', ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        deactivateButton.simulate('keyPress');
        expect(onKeyPress).toHaveBeenCalled();
      });

      it('should call confirm before deactivate', async () => {
        // ensure all assertions are called since we have an async event handler to test
        expect.assertions(5);
        const wrapper = appProvider();
        const { store } = wrapper.instance().props;
        const ev = {
          preventDefault: jest.fn(),
        };
        Bridge = {
          deactivate: jest.fn(),
          registerForTaskEvents: jest.fn(),
          deregisterForTaskEvents: jest.fn(),
        };
        // Attach confirmDialog after Bridge is defined so we can reference it
        Bridge.confirmDialog = jest.fn(() => {
          // Before continuing, make sure we have prevented the click event,
          // but have not yet called deactivate.
          expect(ev.preventDefault).toHaveBeenCalled();
          expect(Bridge.deactivate).not.toHaveBeenCalled();
          return Promise.resolve(true);
        });
        window.Bridge = Bridge;
        // Enzyme can't await async event handlers, so we have to create the
        // call ourselves...
        const evHandler = App.deactivate(store);
        await evHandler(ev);
        // Now confirm all appropriate functions have been called
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(Bridge.confirmDialog).toHaveBeenCalled();
        expect(Bridge.deactivate).toHaveBeenCalled();
      });

      it('should call reset action and deactivate if deactivate is confirmed', async () => {
        expect.assertions(5);
        const wrapper = appProvider();
        const { store } = wrapper.instance().props;
        const ev = {
          preventDefault: jest.fn(),
        };
        Bridge = {
          deactivate: jest.fn(),
          confirmDialog: jest.fn(() => Promise.resolve(true)),
          registerForTaskEvents: jest.fn(),
          deregisterForTaskEvents: jest.fn(),
        };
        window.Bridge = Bridge;
        // Enzyme can't await async event handlers, so we have to create the
        // call ourselves...
        const evHandler = App.deactivate(store);
        await evHandler(ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(Bridge.confirmDialog).toHaveBeenCalled();
        expect(store.dispatch).toHaveBeenCalled();
        expect(store.dispatch.mock.calls[0][0]).toEqual(globalActions.reset());
        expect(Bridge.deactivate).toHaveBeenCalled();
      });

      it('should not call reset action nor deactivate if deactivate is canceled', async () => {
        expect.assertions(4);
        const wrapper = appProvider();
        const { store } = wrapper.instance().props;
        const ev = {
          preventDefault: jest.fn(),
        };
        Bridge = {
          deactivate: jest.fn(),
          confirmDialog: jest.fn(() => Promise.resolve(false)),
          registerForTaskEvents: jest.fn(),
          deregisterForTaskEvents: jest.fn(),
        };
        window.Bridge = Bridge;
        // Enzyme can't await async event handlers, so we have to create the
        // call ourselves...
        const evHandler = App.deactivate(store);
        await evHandler(ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(Bridge.confirmDialog).toHaveBeenCalled();
        expect(store.dispatch).not.toHaveBeenCalled();
        expect(Bridge.deactivate).not.toHaveBeenCalled();
      });
    });

    describe('Close Button', () => {
      it('should render with correct props', () => {
        const wrapper = appProvider();
        const closeButton = getByTestId(wrapper, 'App.button.close');
        expect(closeButton.prop('className')).toBe('close-area-2');
        expect(closeButton.prop('role')).toBe('button');
        expect(closeButton.prop('title')).toBe('close');
        expect(closeButton.prop('onKeyPress')).toBeDefined();
        expect(closeButton.prop('onClick')).toBeDefined();
      });

      it("should not call window bridge method if it isn't defined", () => {
        const onKeyPress = jest.fn();
        const wrapper = appProvider({ onKeyPress });
        const closeButton = getByTestId(wrapper, 'App.button.close');
        const ev = {
          preventDefault: jest.fn(),
        };
        closeButton.simulate('click', ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        closeButton.simulate('keyPress');
        expect(onKeyPress).toHaveBeenCalled();
      });

      it('should call window bridge method if it is defined', () => {
        const wrapper = appProvider();
        const closeButton = getByTestId(wrapper, 'App.button.close');
        const ev = {
          preventDefault: jest.fn(),
        };
        const Bridge = {
          close: jest.fn(),
          registerForTaskEvents: jest.fn(),
          deregisterForTaskEvents: jest.fn(),
        };
        window.Bridge = Bridge;
        closeButton.simulate('click', ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(Bridge.close).toHaveBeenCalled();
        delete window.Bridge;
      });
    });

    describe('Task Event Handler', () => {
      let Bridge = {};

      beforeEach(() => {
        Bridge = {
          registerForTaskEvents: jest.fn(),
          deregisterForTaskEvents: jest.fn(),
        };
        global.window.Bridge = Bridge;
      });

      afterEach(() => {
        if (global.window.Bridge) {
          delete global.window.Bridge;
        }
      });

      it('should get [de]registered properly', () => {
        const wrapper = appProvider();
        expect(Bridge.registerForTaskEvents).toHaveBeenCalledTimes(1);
        wrapper.unmount();
        expect(Bridge.deregisterForTaskEvents).toHaveBeenCalledTimes(1);
      });

      it('should respond to events', () => {
        const store = {
          getState: defaultProps.store.getState,
          dispatch: jest.fn(),
          subscribe: defaultProps.store.subscribe,
        };
        const wrapper = appProvider({ store });
        const appComponent = wrapper.instance();
        expect(appComponent.taskHandler).toBeDefined();

        appComponent.taskHandler({}, 1, 'test message');
        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(store.dispatch).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    describe('Location Syncing', () => {
      it('should load a redirect to the tasks page by default', () => {
        const wrapper = appProvider();
        const redirect = wrapper.find(Redirect);
        expect(redirect).toHaveLength(1);
        expect(redirect.props().to).toBe(ROUTES.TASKS);
      });

      it("should load a redirect the state's location if state and window locations are not in sync", () => {
        const store = {
          getState: jest.fn(() => ({ navbar: { location: '/notdefault' } })),
          dispatch: jest.fn(),
          subscribe: jest.fn(),
        };
        const wrapper = appProvider({ store });
        const redirect = wrapper.find(Redirect);
        expect(redirect).toHaveLength(1);
        expect(redirect.props().to).toBe('/notdefault');
      });
    });
  };

  beforeEach(() => {
    defaultProps = {
      store: {
        getState: jest.fn(() => ({ navbar: { location: '/' } })),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
      },
    };
  });

  describe('<App />', () => {
    const appProvider = customProps => {
      const renderProps = {
        ...defaultProps,
        ...customProps,
      };
      return shallow(<App store={renderProps.store} onKeyPress={renderProps.onKeyPress} />);
    };

    testApp(appProvider);
  });

  describe('Create App', () => {
    const appProvider = customProps => {
      const renderProps = {
        ...defaultProps,
        ...customProps,
      };
      const { store } = renderProps;
      delete renderProps.store;
      return shallow(createApp(store, renderProps));
    };

    testApp(appProvider);
  });
});
