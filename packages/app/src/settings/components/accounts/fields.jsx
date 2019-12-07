import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';
import { makeCurrentAccount } from '../../state/selectors';

const AccountFields = ({ onEdit, account }) => (
  <div className="row row--start row--expand row--gutter" style={{ margin: '15px 0' }}>
    <div className="col col--start col--expand col--no-gutter-right">
      <p className="settings--account-manager__input-group--label">Email Address</p>
      <input
        className="settings--account-manager__input-group--username"
        type="text"
        placeholder="johndoe@gmail.com"
        onChange={e =>
          onEdit({ field: SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME, value: e.target.value })
        }
        value={account.username}
        required
      />
    </div>
    <div className="col col--no-gutter-right">
      <p className="settings--account-manager__input-group--label">Password</p>
      <input
        className="settings--account-manager__input-group--password"
        type="text"
        placeholder="*************"
        onChange={e =>
          onEdit({ field: SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD, value: e.target.value })
        }
        value={account.password}
        required
      />
    </div>
    <div className="col col--gutter">
      <p className="settings--account-manager__input-group--label">Account Name</p>
      <input
        className="settings--account-manager__input-group--password"
        type="text"
        placeholder="Test Account"
        onChange={e => onEdit({ field: SETTINGS_FIELDS.EDIT_ACCOUNT_NAME, value: e.target.value })}
        value={account.name}
        required
      />
    </div>
  </div>
);

AccountFields.propTypes = {
  // props...
  account: PropTypes.objectOf(PropTypes.any).isRequired,
  // funcs...
  onEdit: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  account: makeCurrentAccount(state),
});

export const mapDispatchToProps = dispatch => ({
  onEdit: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AccountFields);
