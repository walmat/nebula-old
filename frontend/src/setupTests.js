/* global jest */
import 'jest-enzyme';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

const localStorageMock = {
  getItem: jest.fn(key => '{}'),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
