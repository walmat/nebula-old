import React, { Component, memo } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import Select from 'react-select';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class CreateProxiesPrimitive extends Component {
  static maskInput(input) {
    if (!input) {
      return '';
    }
    return '*'.repeat(input.length);
  }

  constructor(props) {
    super(props);

    this.fieldMap = {
      [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'isEditingUsername',
      [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'isEditingPassword',
    };

    this.state = {
      isEditingUsername: false,
      isEditingPassword: false,
    };

    this.generate = this.generate.bind(this);
    this.destroyAll = this.destroyAll.bind(this);
    this.onBlurHandler = this.onBlurHandler.bind(this);
    this.onFocusHandler = this.onFocusHandler.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {
      theme,
      proxies,
      proxyOptions: { number, credentials, location, username, password, status },
      credentials: { list },
    } = this.props;

    const { isEditingPassword, isEditingUsername } = this.state;
    if (
      theme !== nextProps.theme ||
      proxies.length !== nextProps.proxies.length ||
      number !== nextProps.proxyOptions.number ||
      JSON.stringify(credentials) !== JSON.stringify(nextProps.proxyOptions.credentials) ||
      JSON.stringify(location) !== JSON.stringify(nextProps.proxyOptions.location) ||
      username !== nextProps.proxyOptions.username ||
      password !== nextProps.proxyOptions.password ||
      status !== nextProps.proxyOptions.status ||
      isEditingPassword !== nextState.isEditingPassword ||
      isEditingUsername !== nextState.isEditingUsername ||
      list.length !== nextProps.credentials.list.length
    ) {
      return true;
    }
    return false;
  }

  onChangeHandler(field) {
    const { onEditServerInfo } = this.props;

    switch (field) {
      case SERVER_FIELDS.EDIT_PROXY_CREDENTIALS:
      case SERVER_FIELDS.EDIT_PROXY_LOCATION: {
        return event => onEditServerInfo(field, event);
      }
      default: {
        return event => onEditServerInfo(field, event.target.value);
      }
    }
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

  buildCredentialsOptions() {
    const {
      credentials: { list },
    } = this.props;
    const opts = [];
    list.forEach(cred =>
      opts.push({ value: cred.AWSSecretKey, label: cred.AWSAccessKey, loggedIn: cred.loggedIn }),
    );
    return opts;
  }

  async destroyAll() {
    const {
      proxyOptions: { location, credentials },
      onDestroyProxies,
      proxies,
    } = this.props;

    let loggedIn = false;
    if (credentials) {
      ({ loggedIn } = credentials);
    }

    const confirm = await window.Bridge.showDialog(
      `Are you sure you want to destroy all proxies in ${location.label}?`,
      'question',
      ['Yes', 'Cancel'],
      'AWS - Destroy All',
    );

    if (confirm && loggedIn) {
      const proxiesToDestroy = proxies.filter(
        p =>
          p.region === location.value &&
          p.credentials.AWSAccessKey === credentials.label &&
          p.credentials.AWSSecretKey === credentials.value,
      );

      if (!proxiesToDestroy.length) {
        return;
      }

      onDestroyProxies({ location }, proxiesToDestroy, credentials);
    }
  }

  async generate() {
    const {
      proxyOptions: { number, credentials, location, username, password },
      onGenerateProxies,
    } = this.props;

    let loggedIn = false;
    if (credentials) {
      ({ loggedIn } = credentials);
    }

    if (loggedIn) {
      onGenerateProxies({ number, location, username, password }, credentials);
    }
  }

  render() {
    const {
      theme,
      proxyOptions: { number, credentials, location, username, password, status },
      serverListOptions,
      onKeyPress,
    } = this.props;

    const { isEditingUsername, isEditingPassword } = this.state;

    let loggedIn = false;
    if (credentials) {
      ({ loggedIn } = credentials);
    }

    return (
      <div className="proxy-options col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Number</p>
                <NumberFormat
                  value={number}
                  placeholder="1-10"
                  style={buildStyle(false, null)}
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--number"
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)}
                  required
                  data-testid={addTestId('CreateProxies.number')}
                />
              </div>
              <div className="col">
                <p className="proxy-options__label">Credentials</p>
                <Select
                  required
                  placeholder="Choose Credentials"
                  components={{ DropdownIndicator }}
                  classNamePrefix="select"
                  className="proxy-options__input--credentials"
                  styles={colourStyles(theme, buildStyle(false, null))}
                  value={credentials}
                  options={this.buildCredentialsOptions()}
                  data-testid={addTestId('CreateProxies.credentials')}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_PROXY_CREDENTIALS)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Location</p>
                <Select
                  required
                  placeholder="AWS Location"
                  components={{ DropdownIndicator }}
                  classNamePrefix="select"
                  className="proxy-options__input--location"
                  styles={colourStyles(theme, buildStyle(false, null))}
                  value={location}
                  options={serverListOptions.locations}
                  data-testid={addTestId('CreateProxies.location')}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_PROXY_LOCATION)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter-left">
                <p className="proxy-options__label">Username</p>
                <input
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--field"
                  type="text"
                  placeholder="Desired Username"
                  style={buildStyle(false, null)}
                  onFocus={() => this.onFocusHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)}
                  onBlur={() => this.onBlurHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)}
                  value={isEditingUsername ? username : CreateProxiesPrimitive.maskInput(username)}
                  required
                  data-testid={addTestId('CreateProxies.username')}
                />
              </div>
              <div className="col col--no-gutter-left">
                <p className="proxy-options__label">Password</p>
                <input
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--field"
                  type="text"
                  placeholder="Desired Password"
                  style={buildStyle(false, null)}
                  onFocus={() => this.onFocusHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  onBlur={() => this.onBlurHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  onChange={this.onChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  value={isEditingPassword ? password : CreateProxiesPrimitive.maskInput(password)}
                  required
                  data-testid={addTestId('CreateProxies.password')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter-left">{status}</div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              type="button"
              className="proxy-options__destroy"
              tabIndex={0}
              onKeyPress={onKeyPress}
              onClick={this.destroyAll}
              data-testid={addTestId('CreateProxies.destroy')}
            >
              Destroy All
            </button>
          </div>
          <div className="col col--no-gutter-left">
            <button
              type="button"
              className="proxy-options__generate"
              tabIndex={0}
              disabled={!loggedIn}
              onKeyPress={onKeyPress}
              onClick={this.generate}
              data-testid={addTestId('CreateProxies.generate')}
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateProxiesPrimitive.propTypes = {
  theme: PropTypes.string.isRequired,
  serverListOptions: defns.serverListOptions.isRequired,
  proxies: defns.proxyList.isRequired,
  proxyOptions: defns.proxyOptions.isRequired,
  credentials: defns.credentials.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
  onGenerateProxies: PropTypes.func.isRequired,
  onDestroyProxies: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

CreateProxiesPrimitive.defaultProps = {
  onKeyPress: () => {},
  // eslint-disable-next-line react/default-props-match-prop-types
  errors: {}, // TODO - add proper error object
};

export const mapStateToProps = state => ({
  theme: state.theme,
  serverListOptions: state.servers.serverListOptions,
  proxies: state.servers.proxies,
  proxyOptions: state.servers.proxyOptions,
  credentials: state.servers.credentials,
});

export const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onGenerateProxies: (options, credentials) => {
    dispatch(serverActions.generateProxies(options, credentials));
  },
  onDestroyProxies: (options, proxies, credentials) => {
    dispatch(serverActions.destroyProxies(options, proxies, credentials));
  },
});

export default memo(
  connect(
    mapStateToProps,
    mapDispatchToProps,
  )(CreateProxiesPrimitive),
);
