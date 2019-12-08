import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Select from 'react-select';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeAccounts } from '../../../../settings/state/selectors';
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

import { buildAccountOptions } from '../../../../constants';
import { buildStyle } from '../../../../styles';

const onChange = (event, onSelect) => {
  if (!event) {
    return onSelect(event);
  }
  return onSelect(event.value);
};

const AccountSelect = ({ theme, account, accounts, onSelect }) => {
  let accountValue = null;
  if (account) {
    const { name, id, username, password } = account;
    accountValue = {
      label: name,
      value: {
        id,
        name,
        username,
        password,
      },
    };
  }

  return (
    <div className="col col--start col--expand" style={{ flexGrow: 5 }}>
      <p className={`create-tasks__label--${theme}`}>Account</p>
      <Select
        isClearable
        backspaceRemovesValue
        required={false}
        placeholder="No Account"
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
        value={accountValue}
        options={buildAccountOptions(accounts)}
        className="create-tasks__select"
        classNamePrefix="select"
      />
    </div>
  );
};

AccountSelect.propTypes = {
  onSelect: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(PropTypes.any).isRequired,
  account: PropTypes.objectOf(PropTypes.any),
  theme: PropTypes.string.isRequired,
};

AccountSelect.defaultProps = {
  account: null,
};

export const mapStateToProps = state => ({
  accounts: makeAccounts(state),
  account: makeCurrentTask(state).account,
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_TASK_ACCOUNT, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AccountSelect);
