/* eslint-disable no-nested-ternary */
import { components } from 'react-select';
import React from 'react';
import PropTypes from 'prop-types';
import { ReactComponent as DropDownClosed } from '../images/dd-down.svg';
import { ReactComponent as DropDownOpened } from '../images/dd-up.svg';
import { ReactComponent as ErrorsDropDownClosed } from '../images/dd-down-errors.svg';
import { ReactComponent as ErrorsDropDownOpened } from '../images/dd-up-errors.svg';
import { THEMES, mapThemeToColor, mapToNextTheme } from '../../constants/themes';
import { renderSvgIcon } from '../../utils/index';

export const DropdownIndicator = props => {

  const {
    selectProps: { menuIsOpen },
    errors,
  } = props;

  let IconOpened = DropDownOpened;
  let IconClosed = DropDownClosed;
  if (errors) {
    IconOpened = ErrorsDropDownOpened;
    IconClosed = ErrorsDropDownClosed;
  }
  return (
    <components.DropdownIndicator {...props}>
      {menuIsOpen
        ? renderSvgIcon(IconOpened, {
            alt: '',
            style: { marginRight: '-5px', cursor: 'pointer' },
          })
        : renderSvgIcon(IconClosed, {
            alt: '',
            style: { marginRight: '-5px', cursor: 'pointer' },
          })}
    </components.DropdownIndicator>
  );
};
DropdownIndicator.propTypes = {
  errors: PropTypes.objectOf(PropTypes.any).isRequired,
  selectProps: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const IndicatorSeparator = () => null;

export const Control = props => <components.Control {...props} data-private />;

export const Option = props => <components.Option {...props} data-private />;

export const Menu = props => <components.Menu {...props} data-private />;

export const MenuList = props => <components.MenuList {...props} data-private />;

export const colourStyles = (theme, provided) => {

  const borderColor = mapThemeToColor[mapToNextTheme[theme]];

  return {
    control: (styles, { isDisabled }) => {
      const key = `${theme}${isDisabled ? '--disabled' : ''}`;
      const backgroundColor = mapThemeToColor[key];
      return {
        ...styles,
        borderColor,
        height: '29px',
        minHeight: '29px',
        borderRadius: '3px',
        outline: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: 'none',
        ':hover': {
          borderColor,
          cursor: 'pointer',
        },
        backgroundColor,
      };
    },
    Indicator: styles => ({
      ...styles,
      padding: '0 8px',
    }),
    IndicatorsContainer: styles => ({
      ...styles,
      padding: '0 8px',
    }),
    DropdownIndicator: styles => ({
      ...styles,
      padding: '0 8px',
      color: borderColor,
    }),
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
        position: 'static',
      };
      if (isMulti) {
        return {
          ...ret,
          overflowX: 'scroll',
          overflowY: 'hidden',
          flexWrap: 'nowrap',
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
      fontFamily: `Lato, sans-serif`,
      fontEeight: 600,
      textTransform: 'capitalize',
      fontSize: '9.5px',
      color: '#6D6E70',
      letterSpacing: 0,
      cursor: 'pointer',
    }),
    singleValue: styles => ({
      ...styles,
      fontFamily: `Lato, sans-serif`,
      fontEeight: 600,
      textTransform: 'capitalize',
      fontSize: '9.5px',
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
  };
};
