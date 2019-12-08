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

import { buildAccountOptions } from '../../../../constants/selects';
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
    <div className="col col--expand col--no-gutter">
      <p className="tasks--create__label">Account</p>
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
        className="tasks--create__input tasks--create__input--field"
        classNamePrefix="select"
      />
    </div>
  );
};

AccountSelect.propTypes = {
  onSelect: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(PropTypes.any).isRequired,
  account: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
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
