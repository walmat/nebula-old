/* global describe it test expect beforeEach */
import { shallow } from 'enzyme';

import renderSvgIcon from '../../utils/renderSvgIcon';
import { ReactComponent as TestIcon } from '../../_assets/close.svg';
import copy from '../../_assets/copy.svg';

describe('renderSvgIcon', () => {
  describe('throws when svg is invalid', () => {
    test('with no custom props', () => {
      expect(() => {
        renderSvgIcon(copy);
      }).toThrow();
    });

    test('with custom props', () => {
      expect(() => {
        renderSvgIcon(copy, { draggable: true, className: 'test' });
      }).toThrow();
    });
  });

  describe('returns when svg is valid', () => {
    test('with no custom props', () => {
      renderSvgIcon(TestIcon);
      const wrapper = shallow(renderSvgIcon(TestIcon));
      expect(wrapper.prop('draggable')).toBeFalsy();
    });

    test('with custom props', () => {
      const wrapper = shallow(renderSvgIcon(TestIcon, { draggable: true, className: 'test' }));
      expect(wrapper.prop('draggable')).toBeTruthy();
      expect(wrapper.prop('className')).toBe('test');
    });
  });
});
