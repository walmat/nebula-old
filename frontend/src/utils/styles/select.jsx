import { components } from 'react-select';
import React from 'react';
import DDD from '../../_assets/dropdown-down.svg';
import DDU from '../../_assets/dropdown-up.svg';

export const DropdownIndicator = props => components.DropdownIndicator && (
  <components.DropdownIndicator {...props}>
    <img src={props.selectProps.menuIsOpen ? DDU : DDD} style={{ marginRight: '-5px', cursor: 'pointer' }} alt="" />
  </components.DropdownIndicator>
);

export const colourStyles = {
  control: (styles, { isDisabled }) => ({
    ...styles,
    border: '1px solid #F0405E',
    backgroundColor: isDisabled ? 'rgb(229, 229, 229)' : '#f4f4f4',
    height: '29px',
    minHeight: '29px',
    borderRadius: '3px',
    outline: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    boxShadow: 'none',
    ':hover': {
      borderColor: '#F0405E',
      cursor: 'pointer',
    },
  }),
  option: (styles, { isDisabled, isFocused, isSelected }) => ({
    ...styles,
    backgroundColor: isFocused ? '#EDBCC6' : isDisabled ? '#ccc' : isSelected ? '#EDBCC6' : '#fff',
    color: '#161318',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    boxShadow: 'none',
  }),
  valueContainer: styles => ({
    ...styles,
    maxHeight: '29px',
    height: '29px',
    cursor: 'pointer',
  }),
  multiValue: styles => ({
    ...styles,
    backgroundColor: '#B8D9D2',
    border: '0.5px solid #46ADB4',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#B8D9D2',
      border: '0.5px solid #46ADB4',
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
    marginTop: '-1px',
    ':hover': {
      backgroundColor: '#46ADB4',
      marginTop: '1px',
      color: '#f4f4f4',
      cursor: 'pointer',
    },
  }),
  menu: styles => ({
    ...styles,
    maxHeight: '175px',
    overflowY: 'scroll',
  }),
  menuList: styles => ({
    ...styles,
    maxHeight: '175px',
    overflowY: 'scroll',
  }),
};
