/* global jest */
const localStorageMock = {
  getItem: jest.fn(key => '{}'),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
