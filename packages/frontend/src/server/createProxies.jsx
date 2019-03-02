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

  render() {
    const {
      serverInfo,
      serverListOptions,
      onKeyPress,
      onDestroyProxies,
      onGenerateProxies,
    } = this.props;
    const loggedInAws = serverInfo.credentials.accessToken != null;
    return (
      <div className="proxy-options col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Number</p>
                <NumberFormat
                  value={serverInfo.proxyOptions.numProxies}
                  format="##"
                  placeholder="00"
                  style={buildStyle(false, null)}
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--number"
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)}
                  required
                  data-testid={addTestId('CreateProxies.numProxiesInput')}
                />
              </div>
              <div className="col">
                <p className="proxy-options__label">Location</p>
                <Select
                  required
                  placeholder="AWS Location"
                  components={{ DropdownIndicator }}
                  classNamePrefix="select"
                  className="proxy-options__input--location"
                  styles={colourStyles(buildStyle(false, null))}
                  value={serverInfo.proxyOptions.location}
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
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Username</p>
                <input
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--field"
                  type="text"
                  placeholder="Desired Username"
                  style={buildStyle(false, null)}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_USERNAME)}
                  value={serverInfo.proxyOptions.username}
                  required
                  data-testid={addTestId('CreateProxies.usernameInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Password</p>
                <input
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--field"
                  type="text"
                  placeholder="Desired Password"
                  style={buildStyle(false, null)}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  value={serverInfo.proxyOptions.password}
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
              disabled={!loggedInAws}
              style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
              title={!loggedInAws ? 'Login Required' : ''}
              onKeyPress={onKeyPress}
              onClick={() => {
                if (loggedInAws) {
                  onDestroyProxies(
                    serverInfo.proxyOptions,
                    serverInfo.proxies,
                    serverInfo.credentials,
                  );
                }
              }}
              data-testid={addTestId('CreateProxies.destroyProxiesButton')}
            >
              Destroy All
            </button>
          </div>
          <div className="col">
            <button
              type="button"
              className="proxy-options__generate"
              tabIndex={0}
              disabled={!loggedInAws}
              style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
              title={!loggedInAws ? 'Login Required' : ''}
              onKeyPress={onKeyPress}
              onClick={() => {
                if (loggedInAws) {
                  onGenerateProxies(serverInfo.proxyOptions, serverInfo.credentials);
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
  onEditServerInfo: PropTypes.func.isRequired,
  serverListOptions: defns.serverListOptions.isRequired,
  serverInfo: defns.serverInfo.isRequired,
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
  serverInfo: state.serverInfo,
  serverListOptions: state.serverListOptions,
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
