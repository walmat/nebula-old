import React, { Component } from 'react';
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
  createServerInfoChangeHandler(field) {
    const { onEditServerInfo } = this.props;
    return event => onEditServerInfo(field, event.target.value);
  }

  createProxyLocationChangeHandle(field) {
    const { onEditServerInfo } = this.props;
    return event => {
      onEditServerInfo(field, event);
    };
  }

  buildCredentialsOptions() {
    const {
      credentials: { list },
    } = this.props;
    const opts = [];
    list.forEach(cred => opts.push({ value: cred.AWSSecretKey, label: cred.AWSAccessKey }));
    return opts;
  }

  render() {
    const {
      theme,
      proxies,
      proxyOptions: { number, credentials, location, username, password },
      serverListOptions,
      onKeyPress,
      onDestroyProxies,
      onGenerateProxies,
    } = this.props;
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
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)}
                  required
                  data-testid={addTestId('CreateProxies.numProxiesInput')}
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
                  value={location}
                  options={this.buildCredentialsOptions()}
                  data-testid={addTestId('CreateProxies.location')}
                  onChange={this.createProxyLocationChangeHandle(SERVER_FIELDS.EDIT_PROXY_LOCATION)}
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
                  onChange={this.createProxyLocationChangeHandle(SERVER_FIELDS.EDIT_PROXY_LOCATION)}
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
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)}
                  value={username}
                  required
                  data-testid={addTestId('CreateProxies.usernameInput')}
                />
              </div>
              <div className="col col--no-gutter-left">
                <p className="proxy-options__label">Password</p>
                <input
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--field"
                  type="text"
                  placeholder="Desired Password"
                  style={buildStyle(false, null)}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  value={password}
                  required
                  data-testid={addTestId('CreateProxies.passwordInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              type="button"
              className="proxy-options__destroy"
              tabIndex={0}
              disabled={loggedIn}
              title={!loggedIn ? 'Login Required' : ''}
              onKeyPress={onKeyPress}
              onClick={() => {
                if (loggedIn) {
                  onDestroyProxies({ location }, proxies, credentials);
                }
              }}
              data-testid={addTestId('CreateProxies.destroyProxiesButton')}
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
              title={!loggedIn ? 'Login Required' : ''}
              onKeyPress={onKeyPress}
              onClick={() => {
                if (loggedIn) {
                  onGenerateProxies({ number, location, username, password }, credentials);
                }
              }}
              data-testid={addTestId('CreateProxies.generateProxiesButton')}
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateProxiesPrimitive);
