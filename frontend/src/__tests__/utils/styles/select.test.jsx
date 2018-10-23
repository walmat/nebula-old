/* global describe it test expect beforeEach */
import React from 'react';
import Select, { components } from 'react-select';
import { mount } from 'enzyme';
import { DropdownIndicator, colourStyles } from '../../../utils/styles/select';

describe('Custom Select', () => {
  describe('<DropdownIndicator />', () => {
    it('should render with given props', () => {
      const wrapper = mount(<Select
        className="test-class"
        placeholder="placeholder test"
        components={{ DropdownIndicator }}
        styles={colourStyles}
        value={{ value: 'test1', label: 'testLabel1' }}
        options={[
          { value: 'test1', label: 'testLabel1' },
          { value: 'test2', label: 'testLabel2' },
          { value: 'test3', label: 'testLabel3' },
        ]}
        menuIsOpen={false}
      />);
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
      test('not disabled', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.control(initialStyle, { isDisabled: false });
        expect(actualStyle).toEqual({
          border: '1px solid #F0405E',
          backgroundColor: '#f4f4f4',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'pointer',
          boxShadow: 'none',
          ':hover': {
            borderColor: '#F0405E',
            cursor: 'pointer',
          },
        });
      });

      test('disabled', () => {
        const initialStyle = {
          height: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.control(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          border: '1px solid #F0405E',
          backgroundColor: 'rgb(229, 229, 229)',
          height: '29px',
          minHeight: '29px',
          borderRadius: '3px',
          outline: 'none',
          cursor: 'not-allowed',
          boxShadow: 'none',
          ':hover': {
            borderColor: '#F0405E',
            cursor: 'pointer',
          },
        });
      });
    });

    describe('option should return the correct style when', () => {
      test('not disabled, focused, nor selected', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.option(initialStyle, {});
        expect(actualStyle).toEqual({
          backgroundColor: '#fff',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        });
      });

      test('disabled', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.option(initialStyle, { isDisabled: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#ccc',
          color: '#161318',
          cursor: 'not-allowed',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        });
      });

      test('focused', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.option(initialStyle, { isFocused: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#EDBCC6',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        });
      });

      test('selected', () => {
        const initialStyle = {
          outline: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.option(initialStyle, { isSelected: true });
        expect(actualStyle).toEqual({
          backgroundColor: '#fff',
          color: '#161318',
          cursor: 'pointer',
          outline: 'none',
          overflow: 'hidden',
          boxShadow: 'none',
        });
      });
    });

    test('value container should return correct style when isMulti', () => {
      const initialStyle = {
        height: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles.valueContainer(initialStyle, { isMulti: true });
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
      const actualStyle = colourStyles.valueContainer(initialStyle, { isMulti: false });
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
      const actualStyle = colourStyles.multiValue(initialStyle);
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

    describe('placeholder should return correct style when', () => {
      test('not disabled', () => {
        const initialStyle = {
          color: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.placeholder(initialStyle, { isDisabled: false });
        expect(actualStyle).toEqual({
          fontFamily: 'AvenirNext-Medium',
          textTransform: 'capitalize',
          fontSize: '9px',
          color: '#6D6E70',
          letterSpacing: 0,
          cursor: 'pointer',
        });
      });

      test('disabled', () => {
        const initialStyle = {
          color: 'invalid', // invalid key to make sure it gets overwritten
        };
        const actualStyle = colourStyles.placeholder(initialStyle, { isDisabled: true });
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

    test('single value should return correct style', () => {
      const initialStyle = {
        color: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles.singleValue(initialStyle);
      expect(actualStyle).toEqual({
        fontFamily: 'AvenirNext-Medium',
        textTransform: 'capitalize',
        fontSize: '9px',
        color: '#161318',
        letterSpacing: 0,
        cursor: 'pointer',
      });
    });

    test('multi value label should return correct style', () => {
      const initialStyle = {
        cursor: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles.multiValueLabel(initialStyle);
      expect(actualStyle).toEqual({
        cursor: 'pointer',
        paddingRight: '5px',
        paddingLeft: '5px',
        ':hover': {
          cursor: 'pointer',
        },
      });
    });

    test('multi value remove should return correct style', () => {
      const initialStyle = {
        cursor: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles.multiValueRemove(initialStyle);
      expect(actualStyle).toEqual({
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#46ADB4',
          color: '#f4f4f4',
          cursor: 'pointer',
        },
      });
    });

    test('menu should return correct style', () => {
      const actualStyle = colourStyles.menu({});
      expect(actualStyle).toEqual({});
    });

    test('menu list should return correct style', () => {
      const initialStyle = {
        maxHeight: 'invalid', // invalid key to make sure it gets overwritten
      };
      const actualStyle = colourStyles.menuList(initialStyle);
      expect(actualStyle).toEqual({
        maxHeight: '175px',
      });
    });
  });
});
