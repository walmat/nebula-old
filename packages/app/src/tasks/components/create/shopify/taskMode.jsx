import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../../styles/components/select';

import { buildTaskModeOptions } from '../../../../constants';
import { buildStyle } from '../../../../styles';

const onChange = (event, onSelect) => {
  if (!event) {
    return onSelect(event);
  }
  return onSelect(event.value);
};

const TaskModeSelect = ({ theme, type, onSelect }) => {
  let typeValue = null;
  if (type) {
    typeValue = {
      label: type,
      value: type,
    };
  }

  return (
    <div className="col col--start col--expand">
      <p className={`create-tasks__label--${theme}`}>Task Mode</p>
      <Select
        required
        placeholder="Safe Mode"
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
        value={typeValue}
        options={buildTaskModeOptions()}
        className="create-tasks__select"
        classNamePrefix="select"
      />
    </div>
  );
};

TaskModeSelect.propTypes = {
  onSelect: PropTypes.func.isRequired,
  type: PropTypes.objectOf(PropTypes.any),
  theme: PropTypes.string.isRequired,
};

TaskModeSelect.defaultProps = {
  type: null,
};

export const mapStateToProps = state => ({
  type: makeCurrentTask(state).type,
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_TASK_TYPE, value));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TaskModeSelect);
