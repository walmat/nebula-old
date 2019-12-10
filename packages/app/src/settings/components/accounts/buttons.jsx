import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentAccount } from '../../state/selectors';
import { settingsActions } from '../../../store/actions';

const Button = ({ account, onClick, type, label }) => (
  <button
    type="button"
    className={`settings--account-manager__input-group--${type}`}
    tabIndex={0}
    onKeyPress={() => {}}
    onClick={() => onClick(account)}
  >
    {label}
  </button>
);

Button.propTypes = {
  type: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  account: PropTypes.objectOf(PropTypes.any).isRequired,
  onClick: PropTypes.func.isRequired,
};

const Buttons = ({ currentAccount, onCreate, onRemove }) => (
  <>
    <div className="col col--end col--no-gutter-right">
      <Button
        account={currentAccount}
        onClick={onCreate}
        type="create"
        label={currentAccount.id ? 'Update' : 'Create'}
      />
    </div>
    <div className="col col--end col--gutter-left">
      <Button account={currentAccount} onClick={onRemove} type="delete" label="Delete" />
    </div>
  </>
);

Buttons.propTypes = {
  // props...
  currentAccount: PropTypes.objectOf(PropTypes.any).isRequired,
  // funcs...
  onCreate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  currentAccount: makeCurrentAccount(state),
});

export const mapDispatchToProps = dispatch => ({
  onCreate: account => {
    dispatch(settingsActions.createAccount(account));
  },
  onRemove: account => {
    dispatch(settingsActions.deleteAccount(account));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Buttons);
