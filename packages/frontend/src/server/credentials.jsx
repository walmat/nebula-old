import React, { Component, memo } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { groupBy } from 'underscore';

import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, mapServerFieldToKey, serverActions } from '../state/actions';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';
import { SERVER_ACTIONS } from '../state/actions/server/serverActions';

export class AWSCredentialsPrimitive extends Component {
  static maskInput(input) {
    if (!input) {
      return '';
    }
    return '*'.repeat(input.length);
  }

  constructor(props) {
    super(props);

    this.fieldMap = {
      [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'isEditingAccess',
      [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'isEditingSecret',
    };

    this.state = {
      isEditingAccess: false,
      isEditingSecret: false,
    };

    this.logoutAws = this.logoutAws.bind(this);
    this.validateAws = this.validateAws.bind(this);
    this.buildCredentialsOptions = this.buildCredentialsOptions.bind(this);
    this.onBlurHandler = this.onBlurHandler.bind(this);
    this.onFocusHandler = this.onFocusHandler.bind(this);
    this.onChangeHandler = this.onChangeHandler.bind(this);
    this.onCredentialsChange = this.onCredentialsChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {
      credentials: { current, selected, list, status },
      theme,
    } = this.props;
    const { isEditingAccess, isEditingSecret } = this.state;

    if (
      theme !== nextProps.theme ||
      status !== nextProps.credentials.status ||
      current.AWSAccessKey !== nextProps.credentials.current.AWSAccessKey ||
      current.AWSSecretKey !== nextProps.credentials.current.AWSSecretKey ||
      selected.AWSAccessKey !== nextProps.credentials.selected.AWSAccessKey ||
      selected.AWSSecretKey !== nextProps.credentials.selected.AWSSecretKey ||
      list.length !== nextProps.credentials.list.length ||
      isEditingAccess !== nextState.isEditingAccess ||
      isEditingSecret !== nextState.isEditingSecret
    ) {
      return true;
    }

    return false;
  }

  onBlurHandler(field) {
    const stateVal = this.fieldMap[field];

    if (!stateVal) {
      return;
    }

    this.setState({ [stateVal]: false });
  }

  onFocusHandler(field) {
    const stateVal = this.fieldMap[field];

    if (!stateVal) {
      return;
    }

    this.setState({ [stateVal]: true });
  }

  onChangeHandler(field) {
    const { onEditServerInfo } = this.props;

    switch (field) {
      default: {
        return event => onEditServerInfo(field, event.target.value);
      }
    }
  }

  onCredentialsChange(credentials) {
    const {
      credentials: { list },
      onSelectCredentials,
    } = this.props;

    if (!credentials) {
      onSelectCredentials(null);
      return;
    }

    const { AWSAccessKey, AWSSecretKey } = credentials;

    const selected = list.find(
      creds => creds.label === AWSAccessKey && creds.value === AWSSecretKey,
    );
    onSelectCredentials(selected);
  }

  async logoutAws(e) {
    e.preventDefault();
    const message =
      'Are you sure you want to log out? Doing so will stop any currently running tasks associated with the proxies, as well as destroy those generated proxies.';
    const {
      onLogoutAws,
      onDestroyProxies,
      proxies,
      credentials: { current },
    } = this.props;

    const confirm = await window.Bridge.showDialog(
      message,
      'question',
      ['Okay', 'Cancel'],
      'AWS - Log out',
    );

    if (confirm) {

      const proxiesToDestroy = groupBy(proxies, 'region');

      if (Object.values(proxiesToDestroy).length) {
        Object.entries(proxiesToDestroy).forEach(([region, proxies]) => {
          onDestroyProxies(
            { location: { value: region }},
            proxies,
            { label: current.AWSAccessKey, value: current.AWSSecretKey },
          );
        });
      }

      onLogoutAws(current);
    }
  }

  buildCredentialsOptions() {
    const {
      credentials: { list },
    } = this.props;
    const opts = [];
    list.forEach(cred => opts.push({ value: cred.AWSSecretKey, label: cred.AWSAccessKey }));
    return opts;
  }

  validateAws(e) {
    e.preventDefault();
    const {
      onValidateAws,
      onHandleError,
      credentials: {
        current: { AWSAccessKey, AWSSecretKey },
        list,
      },
    } = this.props;

    const exists = list.find(
      creds => creds.AWSAccessKey === AWSAccessKey && creds.AWSSecretKey === AWSSecretKey,
    );

    if (exists) {
      onHandleError(SERVER_ACTIONS.VALIDATE_AWS, new Error('Keys already exists'));
      return;
    }

    onValidateAws({ AWSAccessKey, AWSSecretKey });
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
                <p className="server-credentials__label">AWS IAM Profile</p>
                <Select
                  required
                  isClearable
                  placeholder="Choose Credentials"
                  components={{ DropdownIndicator }}
                  className="server-credentials__input server-credentials__input--field"
                  classNamePrefix="select"
                  styles={colourStyles(theme, buildStyle(false, null))}
                  options={this.buildCredentialsOptions()}
                  onChange={this.onCredentialsChange}
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
                  onFocus={() => this.onFocusHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  onBlur={() => this.onBlurHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
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
                  onFocus={() => this.onFocusHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                  onBlur={() => this.onBlurHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
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
  onSelectCredentials: PropTypes.func.isRequired,
  proxies: defns.proxyList.isRequired,
  credentials: defns.credentials.isRequired,
  onValidateAws: PropTypes.func.isRequired,
  onLogoutAws: PropTypes.func.isRequired,
  onHandleError: PropTypes.func.isRequired,
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
  onSelectCredentials: credentials => {
    dispatch(serverActions.select(credentials));
  },
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onValidateAws: credentials => {
    dispatch(serverActions.validateAws(credentials));
  },
  onDestroyProxies: (options, proxies, credentials) => {
    dispatch(serverActions.destroyProxies(options, proxies, credentials));
  },
  onLogoutAws: (servers, proxies, credentials) => {
    dispatch(serverActions.logoutAws(servers, proxies, credentials));
  },
  onHandleError: (action, error) => {
    dispatch(serverActions.error(action, error));
  },
});

export default memo(connect(
  mapStateToProps,
  mapDispatchToProps,
)(AWSCredentialsPrimitive));
