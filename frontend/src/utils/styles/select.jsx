import { components } from 'react-select';
import React from 'react';
import DDD from '../../_assets/dropdown-down.svg';
import DDU from '../../_assets/dropdown-up.svg';

export const DropdownIndicator = (props) => {
  return components.DropdownIndicator && (
    <components.DropdownIndicator {...props}>
      <img src={props.menuIsOpen ? DDU : DDD} style={{ marginRight: '-5px', cursor: 'pointer' }} alt="" />
    </components.DropdownIndicator>
  );
};

export const colourStyles = {
  control: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      border: '1px solid #F0405E',
      backgroundColor: '#f4f4f4',
      height: '29px',
      minHeight: '29px',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
      boxShadow: 'none',
    };
  },
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isFocused ? '#EDBCC6' : isDisabled ? '#ccc' : isSelected ? '#EDBCC6' : '#fff',
      color: '#161318',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: 'none',
    };
  },
  multiValue: (styles) => {
    return {
      ...styles,
      backgroundColor: '#46ADB4',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#B8D9D2',
        cursor: 'pointer',
      },
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    cursor: 'pointer',
    paddingRight: '5px',
    paddingLeft: '5px',
    ':hover': {
      cursor: 'pointer',
    },
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    cursor: 'pointer',
    marginTop: '-1px',
    ':hover': {
      backgroundColor: '#46ADB4',
      marginTop: '1px',
      color: '#f4f4f4',
      cursor: 'pointer',
    },
  }),
  // input: styles => ({ ...styles, ...dot() }),
  // placeholder: styles => ({ ...styles, ...dot() }),
  // singleValue: (styles, { data }) => ({ ...styles, ...dot('#f4f4f4') }),
};
