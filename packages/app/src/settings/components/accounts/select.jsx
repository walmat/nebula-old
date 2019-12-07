import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Select from 'react-select';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../styles/components/select';

import { makeTheme } from '../../../app/state/selectors';
import { makeAccounts, makeCurrentAccount } from '../../state/selectors';

import { settingsActions } from '../../../store/actions';
import { buildAccountListOptions } from '../../../constants/selects';

import { buildStyle } from '../../../styles';

const onChange = (e, accounts, onSelect) => {
  const id = e.value;
  const currentAccount = accounts.find(w => w.id === id);

  onSelect(currentAccount);
};

const SelectAccount = ({ theme, accounts, currentAccount, onSelect }) => {
  let accountValue = null;
  if (currentAccount && currentAccount.id) {
    const { id, name } = currentAccount;
    accountValue = {
      label: name,
      value: id,
    };
  }

  return (
    <div className="col col--end col--expand col--no-gutter-right">
      <p className="settings--shipping-manager__input-group--label">Choose Account</p>
      <Select
        required
        placeholder="Test Account"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        isMulti={false}
        isClearable={false}
        className="settings--account-manager__input-group--account"
        classNamePrefix="select"
        styles={colourStyles(theme, buildStyle(false, null))}
        onChange={e => onChange(e, accounts, onSelect)}
        value={accountValue}
        options={buildAccountListOptions(accounts)}
        data-private
      />
    </div>
  );
};

SelectAccount.propTypes = {
  // props...
  accounts: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentAccount: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
  // funcs...
  onSelect: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  accounts: makeAccounts(state),
  currentAccount: makeCurrentAccount(state),
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSelect: account => {
    dispatch(settingsActions.selectAccount(account));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SelectAccount);
