/* global describe it test expect beforeEach */
import React from 'react';
import renderSvgIcon from '../../utils/renderSvgIcon';
import { ReactComponent as TestIcon } from '../../_assets/close.svg';
import copy from '../../_assets/copy.svg';

describe('test rendering SVG icons', () => {
  describe('when svg is invalid', () => {
    test('with base props', () => {
      const expected = renderSvgIcon(copy);
      expect(expected).toEqual(
        new Error(
          `Icon must be a valid React Component!\n\nMake sure you've imported the icon properly:\nimport { MySvg as ReactComponent } from './path/to/my/svg';`,
        ),
      );
    });

    test('with custom props', () => {
      const expected = renderSvgIcon(copy, { draggable: true, className: 'test' });
      expect(expected).toEqual(
        new Error(
          `Icon must be a valid React Component!\n\nMake sure you've imported the icon properly:\nimport { MySvg as ReactComponent } from './path/to/my/svg';`,
        ),
      );
    });
  });

  describe('when svg is valid', () => {
    test('with base props', () => {
      const expected = renderSvgIcon(TestIcon);
      expect(expected).toEqual(<TestIcon draggable={false} />);
      expect(expected.props).toEqual({ draggable: false });
    });

    test('with custom props', () => {
      const expected = renderSvgIcon(TestIcon, { draggable: true, className: 'test' });
      expect(expected).toEqual(<TestIcon draggable className="test" />);
    });
  });
});
