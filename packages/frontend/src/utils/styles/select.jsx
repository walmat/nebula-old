/* eslint-disable no-nested-ternary */
import { components } from 'react-select';
import React from 'react';
import PropTypes from 'prop-types';
import DDD from '../../_assets/dropdown-down.svg';
import DDU from '../../_assets/dropdown-up.svg';
import THEMES from '../../constants/themes';

export const DropdownIndicator = props => {
  const {
    selectProps: { menuIsOpen },
  } = props;
  return (
    <components.DropdownIndicator {...props}>
      <img src={menuIsOpen ? DDU : DDD} style={{ marginRight: '-5px', cursor: 'pointer' }} alt="" />
    </components.DropdownIndicator>
  );
};
DropdownIndicator.propTypes = {
  selectProps: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const colourStyles = (theme, provided) => ({
  control: (styles, { isDisabled }) => {
    const backgroundColorMap = {
      [THEMES.DARK]: '#393c3f',
      [`${THEMES.DARK}--disabled`]: '#262626',
      [THEMES.LIGHT]: '#f4f4f4',
      [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
    };
    const key = `${theme}${isDisabled ? '--disabled' : ''}`;
    const backgroundColor = backgroundColorMap[key];
    return {
      ...styles,
      border: '1px solid',
      'border-color': (provided && provided.borderColor) || '#46ADB4',
      height: '29px',
      minHeight: '29px',
      borderRadius: '3px',
      outline: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      boxShadow: 'none',
      ':hover': {
        'border-color': (provided && provided.borderColor) || '#46ADB4',
        cursor: 'pointer',
      },
      backgroundColor,
    };
  },
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    if (isDisabled) {
      return {
        ...styles,
        backgroundColor: theme === THEMES.DARK ? '#262626' : '#dcdcdc',
        color: theme === THEMES.DARK ? '#efefef' : '#161318',
        cursor: 'not-allowed',
        outline: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
      };
    }
    const retVal = {
      ...styles,
      color: theme === THEMES.DARK && !isFocused ? '#efefef' : '#161318',
      cursor: 'pointer',
      outline: 'none',
      boxShadow: 'none',
      overflow: 'hidden',
      backgroundColor: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
      ':selected': {
        color: '#161318',
      },
      ':hover': {
        color: '#161318',
      },
    };
    if (isFocused) {
      return { ...retVal, backgroundColor: '#EDBCC6' };
    }
    if (isSelected) {
      return {
        ...retVal,
        backgroundColor: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
      };
    }
    return retVal;
  },
  valueContainer: (styles, { isMulti }) => {
    const ret = {
      ...styles,
      maxHeight: '29px',
      height: '29px',
      cursor: 'pointer',
    };
    if (isMulti) {
      return {
        ...ret,
        'overflow-x': 'scroll',
        'overflow-y': 'hidden',
        'flex-wrap': 'nowrap',
        '::-webkit-scrollbar': {
          width: '0px',
          height: '0px',
          background: 'transparent',
        },
      };
    }
    return ret;
  },
  multiValue: styles => ({
    ...styles,
    backgroundColor: '#B8D9D2',
    display: 'flex',
    'flex-shrink': 0,
    border: '0.5px solid #46ADB4',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#B8D9D2',
      border: '0.5px solid #46ADB4',
      cursor: 'pointer',
    },
  }),
  multiValueLabel: styles => ({
    ...styles,
    cursor: 'pointer',
    paddingRight: '5px',
    paddingLeft: '5px',
    ':hover': {
      cursor: 'pointer',
    },
  }),
  multiValueRemove: styles => ({
    ...styles,
    cursor: 'pointer',
    color: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
    ':hover': {
      backgroundColor: '#46ADB4',
      color: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
      cursor: 'pointer',
    },
  }),
  placeholder: styles => ({
    ...styles,
    fontFamily: 'AvenirNext-Medium',
    textTransform: 'capitalize',
    fontSize: '9px',
    color: '#6D6E70',
    letterSpacing: 0,
    cursor: 'pointer',
  }),
  singleValue: styles => ({
    ...styles,
    fontFamily: 'AvenirNext-Medium',
    textTransform: 'capitalize',
    fontSize: '9px',
    color: theme === THEMES.DARK ? '#efefef' : '#161318',
    letterSpacing: 0,
    cursor: 'pointer',
  }),
  menu: styles => ({
    ...styles,
    backgroundColor: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
  }),
  menuList: styles => ({
    ...styles,
    backgroundColor: theme === THEMES.DARK ? '#393c3f' : '#f4f4f4',
    maxHeight: '150px',
  }),
});
