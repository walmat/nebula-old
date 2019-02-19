/* global describe it test expect beforeEach */
import React from 'react';
import Select, { components } from 'react-select';
import { mount } from 'enzyme';
import { DropdownIndicator, colourStyles } from '../../../utils/styles/select';
import { themes } from '../../../constants/themes';

describe('Custom Select', () => {
  describe('<DropdownIndicator />', () => {
    it('should render with given props', () => {
      const wrapper = mount(
        <Select
          className="test-class"
          placeholder="placeholder test"
          components={{ DropdownIndicator }}
          styles={colourStyles()}
          value={{ value: 'test1', label: 'testLabel1' }}
          options={[
            { value: 'test1', label: 'testLabel1' },
            { value: 'test2', label: 'testLabel2' },
            { value: 'test3', label: 'testLabel3' },
          ]}
          menuIsOpen={false}
        />,
      );
      expect(wrapper.find(components.DropdownIndicator)).toHaveLength(1);
      let indicator = wrapper.find(components.DropdownIndicator);
      expect(indicator.find('img')).toHaveLength(1);
      wrapper.setProps({
        menuIsOpen: true,
      });
      indicator = wrapper.find(components.DropdownIndicator);
      expect(indicator.find('img')).toHaveLength(1);
    });
  });

  describe('colour styles', () => {
    describe('control should return the correct style when', () => {
      test('not disabled light theme', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).control(initialStyle, { isDisabled: false });
        expect(actualStyle).toEqual({
          border: '1px solid',
          'border-color': '#46ADB4',
          backgroundColor: '#f4f4f4',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'pointer',
          boxShadow: 'none',
          ':hover': {
            'border-color': '#46ADB4',
            cursor: 'pointer',
          },
        });
      });

      test('not disabled dark theme', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).control(initialStyle, { isDisabled: false });
        expect(actualStyle).toEqual({
          border: '1px solid',
          'border-color': '#46ADB4',
          backgroundColor: '#393c3f',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'pointer',
          boxShadow: 'none',
          ':hover': {
            'border-color': '#46ADB4',
            cursor: 'pointer',
          },
        });
      });

      test('disabled light theme', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).control(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          border: '1px solid',
          'border-color': '#46ADB4',
          backgroundColor: '#dcdcdc',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'not-allowed',
          boxShadow: 'none',
          ':hover': {
            'border-color': '#46ADB4',
            cursor: 'pointer',
          },
        });
      });

      test('disabled dark theme', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).control(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          border: '1px solid',
          'border-color': '#46ADB4',
          backgroundColor: '#262626',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'not-allowed',
          boxShadow: 'none',
          ':hover': {
            'border-color': '#46ADB4',
            cursor: 'pointer',
          },
        });
      });
    });

    describe('option should return the correct style when', () => {
      test('not disabled, focused, nor selected and light theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).option(initialStyle, {});
        expect(actualStyle).toEqual({
          backgroundColor: '#f4f4f4',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });

      test('not disabled, focused, nor selected and dark theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).option(initialStyle, {
          isFocused: false,
          isSelected: false,
          isDisabled: false,
        });
        expect(actualStyle).toEqual({
          backgroundColor: '#393c3f',
          color: '#efefef',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });

      test('disabled light theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).option(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#dcdcdc',
          color: '#161318',
          cursor: 'not-allowed',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        });
      });

      test('disabled dark theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).option(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#262626',
          color: '#efefef',
          cursor: 'not-allowed',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        });
      });

      test('focused light theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).option(initialStyle, { isFocused: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#EDBCC6',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });

      test('focused dark theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).option(initialStyle, { isFocused: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#EDBCC6',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });

      test('selected light theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).option(initialStyle, { isSelected: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#f4f4f4',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });

      test('selected dark theme', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).option(initialStyle, { isSelected: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#393c3f',
          color: '#efefef',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          ':selected': {
            color: '#161318',
          },
          ':hover': {
            color: '#161318',
          },
        });
      });
    });

    test('value container should return correct style when isMulti', () => {
      const initialStyle = {
        height: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles().valueContainer(initialStyle, { isMulti: true });
      expect(actualStyle).toEqual({
        maxHeight: '29px',
        height: '29px',
        cursor: 'pointer',
        'overflow-x': 'scroll',
        'overflow-y': 'hidden',
        'flex-wrap': 'nowrap',
        '::-webkit-scrollbar': {
          width: '0px',
          height: '0px',
          background: 'transparent',
        },
      });
    });

    test('value container should return correct style', () => {
      const initialStyle = {
        height: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles().valueContainer(initialStyle, { isMulti: false });
      expect(actualStyle).toEqual({
        maxHeight: '29px',
        height: '29px',
        cursor: 'pointer',
      });
    });

    test('multi value should return correct style', () => {
      const initialStyle = {
        border: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles().multiValue(initialStyle);
      expect(actualStyle).toEqual({
        backgroundColor: '#B8D9D2',
        border: '0.5px solid #46ADB4',
        cursor: 'pointer',
        display: 'flex',
        'flex-shrink': 0,
        ':hover': {
          backgroundColor: '#B8D9D2',
          border: '0.5px solid #46ADB4',
          cursor: 'pointer',
        },
      });
    });

    test('multi value label should return correct style', () => {
      const initialStyle = {
        cursor: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles().multiValueLabel(initialStyle);
      expect(actualStyle).toEqual({
        cursor: 'pointer',
        paddingRight: '5px',
        paddingLeft: '5px',
        ':hover': {
          cursor: 'pointer',
        },
      });
    });

    describe('multi value remove should return correct style', () => {
      test('when light mode', () => {
        const initialStyle = {
          cursor: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).multiValueRemove(initialStyle);
        expect(actualStyle).toEqual({
          cursor: 'pointer',
          color: '#f4f4f4',
          ':hover': {
            backgroundColor: '#46ADB4',
            color: '#f4f4f4',
            cursor: 'pointer',
          },
        });
      });

      test('when dark mode', () => {
        const initialStyle = {
          cursor: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).multiValueRemove(initialStyle);
        expect(actualStyle).toEqual({
          cursor: 'pointer',
          color: '#393c3f',
          ':hover': {
            backgroundColor: '#46ADB4',
            color: '#393c3f',
            cursor: 'pointer',
          },
        });
      });
    });

    describe('placeholder should return correct style when', () => {
      test('not disabled', () => {
        const initialStyle = {
          color: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles().placeholder(initialStyle);
        expect(actualStyle).toEqual({
          fontFamily: 'AvenirNext-Medium',
          textTransform: 'capitalize',
          fontSize: '9px',
          color: '#6D6E70',
          letterSpacing: 0,
          cursor: 'pointer',
        });
      });
    });

    describe('single value should return correct style', () => {
      test('when light mode', () => {
        const initialStyle = {
          color: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).singleValue(initialStyle);
        expect(actualStyle).toEqual({
          fontFamily: 'AvenirNext-Medium',
          textTransform: 'capitalize',
          fontSize: '9px',
          color: '#161318',
          letterSpacing: 0,
          cursor: 'pointer',
        });
      });

      test('when dark mode', () => {
        const initialStyle = {
          color: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).singleValue(initialStyle);
        expect(actualStyle).toEqual({
          fontFamily: 'AvenirNext-Medium',
          textTransform: 'capitalize',
          fontSize: '9px',
          color: '#efefef',
          letterSpacing: 0,
          cursor: 'pointer',
        });
      });
    });

    describe('menu should return correct style', () => {
      test('when light mode', () => {
        const actualStyle = colourStyles(themes.LIGHT).menu({});
        expect(actualStyle).toEqual({
          backgroundColor: '#f4f4f4',
        });
      });

      test('when light mode', () => {
        const actualStyle = colourStyles(themes.DARK).menu({});
        expect(actualStyle).toEqual({
          backgroundColor: '#393c3f',
        });
      });
    });

    describe('menu list should return correct style', () => {
      test('when light mode', () => {
        const initialStyle = {
          maxHeight: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.LIGHT).menuList(initialStyle);
        expect(actualStyle).toEqual({
          backgroundColor: '#f4f4f4',
          maxHeight: '150px',
        });
      });

      test('when dark mode', () => {
        const initialStyle = {
          maxHeight: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles(themes.DARK).menuList(initialStyle);
        expect(actualStyle).toEqual({
          backgroundColor: '#393c3f',
          maxHeight: '150px',
        });
      });
    });
  });
});
