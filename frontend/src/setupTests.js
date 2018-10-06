/* global jest */
/* eslint-disable */
import 'jest-enzyme';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
/* eslint-enable */

// /////////////////////////////////////
// Enzyme Setup
// /////////////////////////////////////
configure({ adapter: new Adapter() });

// /////////////////////////////////////
// Local storage mock
// /////////////////////////////////////
const localStorageMock = {
  getItem: jest.fn(key => '{}'),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// /////////////////////////////////////
// document queryCommandSupported mock
// /////////////////////////////////////

// internal supported commands object
const _supportedCommands = {};

// Helper method to setup supported command
global.__registerSupportedCommand = (command) => {
  _supportedCommands[command] = true;
};

// Helper method to disable supported command
global.__deregisterSupportedCommand = (command) => {
  if (_supportedCommands[command]) {
    delete _supportedCommands[command];
  }
};

// The mocked implementation
global.document.queryCommandSupported = command => _supportedCommands[command];

// /////////////////////////////////////
// document execCommand mock
// /////////////////////////////////////

// internal object to hold the handler
let nextHandler = null;

// Helper method to register the next handler
global.__registerNextExecCommandHandler = (handler) => {
  nextHandler = handler;
};

// Helper method to clear out the next handler
global.__clearNextExecCommandHandler = () => {
  nextHandler = null;
};

// The mocked implementation
global.document.execCommand = (commandName, showDefaultUI, value) => {
  if (nextHandler) {
    const res = nextHandler(commandName, showDefaultUI, value);
    nextHandler = null;
    return res;
  }
  return true;
};
