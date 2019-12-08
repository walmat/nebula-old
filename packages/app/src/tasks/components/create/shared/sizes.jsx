import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import CreatableSelect from 'react-select/creatable';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import * as getAllSizes from '../../../../constants/getAllSizes';
import { createSize } from '../../../../constants/tasks';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../../styles/components/select';
import { buildStyle } from '../../../../styles';

const handleCreateSize = (event, onChange) => {
  const newSize = createSize(event);

  if (!newSize) {
    return null;
  }
  return onChange(newSize);
};

const SizeSelect = ({ theme, size, onSelect }) => {
  let newSizeValue = null;
  if (size) {
    newSizeValue = {
      value: size,
      label: size,
    };
  }

  return (
    <div className="col col--start col--expand" style={{ flexGrow: 3 }}>
      <p className={`create-tasks__label--${theme}`}>Size</p>
      <CreatableSelect
        required
        isClearable={false}
        placeholder="Choose Size"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        styles={colourStyles(theme, buildStyle(false, null))}
        onCreateOption={e => handleCreateSize(e, onSelect)}
        onChange={e => onSelect(e.value)}
        value={newSizeValue}
        options={getAllSizes.default()}
        className="create-tasks__select"
        classNamePrefix="select"
      />
    </div>
  );
};

SizeSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  size: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
  theme: makeTheme(state),
  size: makeCurrentTask(state).size,
});

const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_SIZE, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SizeSelect);
