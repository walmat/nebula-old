import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, mapServerFieldToKey, serverActions } from '../state/actions';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class AWSCredentialsPrimitive extends Component {
  static maskInput(input) {
    return '*'.repeat(input.length);
  }

  constructor(props) {
    super(props);
    this.logoutAws = this.logoutAws.bind(this);
    this.validateAws = this.validateAws.bind(this);
    this.buildCredentialsOptions = this.buildCredentialsOptions.bind(this);

    this.state = {
      isEditingAccess: false,
      isEditingSecret: false,
    };
  }

  logoutAws(e) {
    e.preventDefault();
    const message =
      'Are you sure you want to log out of AWS? Logging out will stop any currently running tasks and destroy any generated proxies.';
    const { onLogoutAws, proxies, credentials } = this.props;
    window.Bridge.confirmDialog(message).then(logout => {
      if (logout) {
        onLogoutAws(proxies, credentials);
      }
    });
  }

  buildCredentialsOptions() {
    const {
      credentials: { list },
    } = this.props;
    const opts = [];
    list.forEach(cred => opts.push({ value: cred.AWSSecretKey, label: cred.AWSAccessKey }));
    return opts;
  }

  createServerInfoChangeHandler(field) {
    const { onEditServerInfo } = this.props;
    return event => onEditServerInfo(field, event.target.value);
  }

  validateAws(e) {
    e.preventDefault();
    const {
      onValidateAws,
      credentials: { current },
    } = this.props;
    onValidateAws(current);
  }

  handleOnBlur(field) {
    switch (field) {
      case SERVER_FIELDS.EDIT_AWS_ACCESS_KEY: {
        this.setState({ isEditingAccess: false });
        break;
      }
      case SERVER_FIELDS.EDIT_AWS_SECRET_KEY: {
        this.setState({ isEditingSecret: false });
        break;
      }
      default:
        break;
    }
  }

  handleOnFocus(field) {
    switch (field) {
      case SERVER_FIELDS.EDIT_AWS_ACCESS_KEY: {
        this.setState({ isEditingAccess: true });
        break;
      }
      case SERVER_FIELDS.EDIT_AWS_SECRET_KEY: {
        this.setState({ isEditingSecret: true });
        break;
      }
      default:
        break;
    }
  }

  render() {
    const {
      credentials: { selected, current, status },
      errors,
      onKeyPress,
      theme,
    } = this.props;
    const { isEditingAccess, isEditingSecret } = this.state;
    let selectedValue = null;
    if (selected && selected.AWSAccessKey) {
      selectedValue = {
        value: selected.AWSSecretKey,
        label: selected.AWSAccessKey,
      };
    }
    let loggedIn = false;
    let AWSAccessKey = '';
    let AWSSecretKey = '';
    if (current) {
      ({ loggedIn, AWSAccessKey, AWSSecretKey } = current);
    }
    return (
      <div className="server-credentials col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col server-credentials__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="server-credentials__label">Select Credentials</p>
                <Select
                  required
                  isClearable
                  placeholder="IAM User Access Key"
                  components={{ DropdownIndicator }}
                  className="server-credentials__input server-credentials__input--field"
                  classNamePrefix="select"
                  styles={colourStyles(theme, buildStyle(false, null))}
                  onChange={this.buildCredentialsOptions()}
                  value={selectedValue}
                  data-testid={addTestId('AWSCredentials.accessKeyInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col server-credentials__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="server-credentials__label">AWS Access Key</p>
                <input
                  className="server-credentials__input server-credentials__input--bordered server-credentials__input--field"
                  type="text"
                  placeholder="IAM User Access"
                  disabled={loggedIn}
                  style={buildStyle(
                    false,
                    errors[mapServerFieldToKey[SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]],
                  )}
                  onFocus={() => this.handleOnFocus(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  onBlur={() => this.handleOnBlur(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  value={
                    isEditingAccess
                      ? AWSAccessKey || ''
                      : AWSCredentialsPrimitive.maskInput(AWSAccessKey || '')
                  }
                  required
                  data-testid={addTestId('AWSCredentials.accessKeyInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col server-credentials__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="server-credentials__label">AWS Secret Key</p>
                <input
                  className="server-credentials__input server-credentials__input--bordered server-credentials__input--field"
                  type="text"
                  placeholder="IAM User Secret"
                  disabled={loggedIn}
                  style={buildStyle(
                    false,
                    errors[mapServerFieldToKey[SERVER_FIELDS.EDIT_AWS_SECRET_KEY]],
                  )}
                  onFocus={() => this.handleOnFocus(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                  onBlur={() => this.handleOnBlur(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                  value={
                    isEditingSecret
                      ? AWSSecretKey || ''
                      : AWSCredentialsPrimitive.maskInput(AWSSecretKey || '')
                  }
                  required
                  data-testid={addTestId('AWSCredentials.secretKeyInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <p>{status || ''}</p>
          </div>
          <div className="col">
            <button
              type="button"
              className="server-credentials__submit"
              tabIndex={0}
              onKeyPress={onKeyPress}
              onClick={loggedIn ? this.logoutAws : this.validateAws}
              data-testid={addTestId('AWSCredentials.submitButton')}
            >
              {loggedIn ? 'Log out' : 'Validate'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

AWSCredentialsPrimitive.propTypes = {
  onEditServerInfo: PropTypes.func.isRequired,
  proxies: defns.proxyList.isRequired,
  credentials: defns.credentials.isRequired,
  onValidateAws: PropTypes.func.isRequired,
  onLogoutAws: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  errors: PropTypes.objectOf(PropTypes.any),
};

AWSCredentialsPrimitive.defaultProps = {
  onKeyPress: () => {},
  // eslint-disable-next-line react/default-props-match-prop-types
  errors: {}, // TODO - add proper error object
};

export const mapStateToProps = state => ({
  credentials: state.servers.credentials,
  proxies: state.servers.proxies,
  theme: state.theme,
});

export const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onValidateAws: credentials => {
    dispatch(serverActions.validateAws(credentials));
  },
  onLogoutAws: (servers, proxies, credentials) => {
    dispatch(serverActions.logoutAws(servers, proxies, credentials));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AWSCredentialsPrimitive);
