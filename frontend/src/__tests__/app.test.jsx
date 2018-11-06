/* global describe it test beforeEach afterEach expect jest */
import React from 'react';
import { shallow } from 'enzyme';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import createApp, { App } from '../app';
import Navbar from '../navbar/navbar';
import Tasks from '../tasks/tasks';
import Profiles from '../profiles/profiles';
import Server from '../server/server';
import Settings from '../settings/settings';
import { TASK_ACTIONS } from '../state/actions';

import getByTestId from '../__testUtils__/getByTestId';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('Top Level App', () => {
  let defaultProps;

  const testApp = (appProvider) => {
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
      wrapper.unmount();
    });

    describe('Deactivate Button', () => {
      it('should render with correct props', () => {
        const wrapper = appProvider();
        const deactivateButton = getByTestId(wrapper, 'App.button.deactivate');
        expect(deactivateButton.prop('className')).toBe('close-area-1');
        expect(deactivateButton.prop('role')).toBe('button');
        expect(deactivateButton.prop('title')).toBe('deactivate');
        expect(deactivateButton.prop('onKeyPress')).toBeDefined();
        expect(deactivateButton.prop('onClick')).toBeDefined();
      });

      it('should not call window brige method if it isn\'t defined', () => {
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

      it('should call window brige method if it is defined', () => {
        const wrapper = appProvider();
        const deactivateButton = getByTestId(wrapper, 'App.button.deactivate');
        const ev = {
          preventDefault: jest.fn(),
        };
        const Bridge = {
          deactivate: jest.fn(),
        };
        window.Bridge = Bridge;
        deactivateButton.simulate('click', ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(Bridge.deactivate).toHaveBeenCalled();
        delete window.Bridge;
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

      it('should not call window brige method if it isn\'t defined', () => {
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

      it('should call window brige method if it is defined', () => {
        const wrapper = appProvider();
        const closeButton = getByTestId(wrapper, 'App.button.close');
        const ev = {
          preventDefault: jest.fn(),
        };
        const Bridge = {
          close: jest.fn(),
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
          dispatch: jest.fn(),
        };
        const wrapper = appProvider({ store });
        const appComponent = wrapper.instance();
        expect(appComponent.taskHandler).toBeDefined();

        appComponent.taskHandler({}, 1, 'test message');
        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(store.dispatch).toHaveBeenCalledWith(expect.any(Function));
      });
    });
  };

  beforeEach(() => {
    defaultProps = {
      store: mockStore(),
    };
  });

  describe('<App />', () => {
    const appProvider = (customProps) => {
      const renderProps = {
        ...defaultProps,
        ...customProps,
      };
      return shallow(<App
        store={renderProps.store}
        onKeyPress={renderProps.onKeyPress}
      />);
    };

    testApp(appProvider);
  });

  describe('Create App', () => {
    const appProvider = (customProps) => {
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
