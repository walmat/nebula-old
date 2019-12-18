import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeAccounts } from '../../../../settings/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import { buildCategoryOptions } from '../../../../constants';

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

const onChange = (event, onSelect) => {
  if (!event) {
    return onSelect(event);
  }
  return onSelect(event.value);
};

const CategorySelect = ({ category, theme, onSelect }) => {
  const categoryValue = category ? { label: category, value: category } : null;

  return (
    <div className="col col--start col--expand" style={{ flexGrow: 5 }}>
      <p className={`create-tasks__label--${theme}`}>Category</p>
      <Select
        isClearable
        backspaceRemovesValue
        required
        placeholder="No Category"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        styles={colourStyles(theme, buildStyle(false, null))}
        onChange={e => onChange(e, onSelect)}
        value={categoryValue}
        options={buildCategoryOptions()}
        className="create-tasks__input"
        classNamePrefix="select"
      />
    </div>
  );
};

CategorySelect.propTypes = {
  category: PropTypes.string,
  theme: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

CategorySelect.defaultProps = {
  category: null,
};

export const mapStateToProps = state => ({
  accounts: makeAccounts(state),
  category: makeCurrentTask(state).category,
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_TASK_CATEGORY, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CategorySelect);
