import { components } from 'react-select';
import React from 'react';
import DDD from '../../_assets/dropdown-down.svg';
import DDU from '../../_assets/dropdown-up.svg';

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

export const colourStyles = provided => ({
  control: (styles, { isDisabled }) => ({
    ...styles,
    border: '1px solid',
    'border-color': (provided && provided.borderColor) || '#46ADB4',
    backgroundColor: isDisabled ? 'rgb(229, 229, 229)' : '#f4f4f4',
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
  }),
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    if (isDisabled) {
      return {
        ...styles,
        backgroundColor: '#ccc',
        color: '#161318',
        cursor: 'not-allowed',
        outline: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
      };
    }
    const retVal = {
      ...styles,
      color: '#161318',
      cursor: 'pointer',
      outline: 'none',
      boxShadow: 'none',
      overflow: 'hidden',
      backgroundColor: '#fff', // fallback
    };
    if (isFocused) {
      return { ...retVal, backgroundColor: '#EDBCC6' };
    }
    if (isSelected) {
      return { ...retVal, backgroundColor: '#fff' };
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
    ':hover': {
      backgroundColor: '#46ADB4',
      color: '#f4f4f4',
      cursor: 'pointer',
    },
  }),
  placeholder: (styles, { isDisabled }) => ({
    ...styles,
    fontFamily: 'AvenirNext-Medium',
    textTransform: 'capitalize',
    fontSize: '9px',
    color: isDisabled ? '#6D6E70' : '#6D6E70',
    letterSpacing: 0,
    cursor: 'pointer',
  }),
  singleValue: styles => ({
    ...styles,
    fontFamily: 'AvenirNext-Medium',
    textTransform: 'capitalize',
    fontSize: '9px',
    color: '#161318',
    letterSpacing: 0,
    cursor: 'pointer',
  }),
  menu: styles => ({
    ...styles,
  }),
  menuList: styles => ({
    ...styles,
    maxHeight: '175px',
  }),
});
