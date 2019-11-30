import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../../styles';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';

import { makeTheme } from '../../app/state/selectors';
import { makeAccounts, makeCurrentAccount } from '../state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../store/actions';

import addTestId from '../../utils/addTestId';

export class AccountManagerPrimitive extends PureComponent {
  constructor(props) {
    super(props);

    this.selects = {
      [SETTINGS_FIELDS.SELECT_ACCOUNT]: {
        label: 'Account',
        placeholder: 'Choose Account',
        type: 'account',
        className: 'col',
      },
    };
    this.buttons = {
      [SETTINGS_FIELDS.DELETE_ACCOUNT]: {
        label: 'Delete',
        type: 'delete',
      },
      [SETTINGS_FIELDS.SAVE_ACCOUNT]: {
        label: 'Save',
        type: 'save',
      },
    };
  }

  buildAccountOptions() {
    const {
      accounts: { list },
    } = this.props;
    const opts = [];
    list.forEach(acc => {
      opts.push({ value: acc.id, label: acc.name });
    });
    return opts;
  }

  createOnChangeHandler(field) {
    const { onSettingsChange, onSelectAccount } = this.props;
    switch (field) {
      case SETTINGS_FIELDS.SELECT_ACCOUNT:
        return event => {
          onSelectAccount({ value: event.value });
        };
      default:
        return event => {
          onSettingsChange({
            field,
            value: event.target.value,
          });
        };
    }
  }

  renderButton(field, value) {
    const { onKeyPress, onSaveAccount, onDeleteAccount } = this.props;
    const { type } = this.buttons[field];
    const { label } = this.buttons[field];
    let onClick;
    switch (field) {
      case SETTINGS_FIELDS.SAVE_ACCOUNT: {
        onClick = () => onSaveAccount(value);
        break;
      }
      case SETTINGS_FIELDS.DELETE_ACCOUNT: {
        onClick = () => onDeleteAccount(value);
        break;
      }
      default: {
        onClick = () => {};
      }
    }

    return (
      <button
        type="button"
        className={`settings--account-manager__input-group--${type}`}
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClick}
        data-testid={addTestId(`ShippingManager.button.${type}`)}
      >
        {label}
      </button>
    );
  }

  render() {
    const { currentAccount, theme } = this.props;
    const { username, password, name } = currentAccount;

    return (
      <>
        <div className="row row--gutter" style={{ flexGrow: 0 }}>
          <div className="col col--start col--expand col--no-gutter">
            <div className="row row--start row--gutter">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header settings--account-manager__section-header">
                  Account Manager
                </p>
              </div>
            </div>
            <div className="row row--start row--gutter-left">
              <div className="col col--start col--expand col--no-gutter">
                <div className="row row--start row--expand row--no-gutter-left">
                  <div className="col col--start col--expand settings--account-manager__input-group">
                    <div
                      className="row row--start row--expand row--gutter"
                      style={{ margin: '15px 0' }}
                    >
                      <div className="col col--start col--expand col--no-gutter-right">
                        <p className="settings--account-manager__input-group--label">
                          Email Address
                        </p>
                        <input
                          className="settings--account-manager__input-group--username"
                          type="text"
                          placeholder="johnsmith@gmail.com"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME,
                          )}
                          value={username}
                          required
                        />
                      </div>
                      <div className="col col--no-gutter-right">
                        <p className="settings--account-manager__input-group--label">Password</p>
                        <input
                          className="settings--account-manager__input-group--password"
                          type="text"
                          placeholder="*************"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD,
                          )}
                          value={password}
                          required
                        />
                      </div>
                      <div className="col col--gutter">
                        <p className="settings--account-manager__input-group--label">
                          Account Name
                        </p>
                        <input
                          className="settings--account-manager__input-group--password"
                          type="text"
                          placeholder="Test Account"
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_ACCOUNT_NAME)}
                          value={name}
                          required
                        />
                      </div>
                    </div>
                    <div className="row row--gutter" style={{ marginBottom: '15px' }}>
                      <div className="col col--end col--expand col--no-gutter-right">
                        <p className="settings--shipping-manager__input-group--label">
                          Choose Account
                        </p>
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
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.SELECT_ACCOUNT)}
                          value={accountValue}
                          options={this.buildAccountOptions()}
                          data-private
                        />
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        {this.renderButton(SETTINGS_FIELDS.SAVE_ACCOUNT, currentAccount)}
                      </div>
                      <div className="col col--end col--gutter-left">
                        {this.renderButton(SETTINGS_FIELDS.DELETE_ACCOUNT, selectedAccount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

AccountManagerPrimitive.propTypes = {
  // props...
  accounts: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentAccount: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
  // funcs...
  onSelectAccount: PropTypes.func.isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  onSaveAccount: PropTypes.func.isRequired,
  onDeleteAccount: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

AccountManagerPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  accounts: makeAccounts(state),
  currentAccount: makeCurrentAccount(state),
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
  onSelectAccount: account => {
    dispatch(settingsActions.selectAccount(account));
  },
  onSaveAccount: account => {
    dispatch(settingsActions.addAccount(account));
  },
  onDeleteAccount: account => {
    dispatch(settingsActions.deleteAccount(account));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AccountManagerPrimitive);
