import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import Select from 'react-select';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';
import addTestId from '../utils/addTestId';

export class CreateProxiesPrimitive extends Component {
  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target.value);
  }

  createProxyLocationChangeHandle(field) {
    return (event) => {
      console.log(event);
      this.props.onEditServerInfo(field, event);
    };
  }

  render() {
    const { serverInfo } = this.props;
    const loggedInAws = this.props.serverInfo.credentials.accessToken != null;
    return (
      <div className="proxy-options col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col proxy-options__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="proxy-options__label">Number</p>
                <NumberFormat
                  value={serverInfo.proxyOptions.numProxies || ''}
                  format="##"
                  placeholder="00"
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
                  styles={colourStyles}
                  value={serverInfo.proxyOptions.location}
                  options={this.props.serverListOptions.locations}
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
              className="proxy-options__destroy"
              tabIndex={0}
              disabled={!loggedInAws}
              style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
              title={!loggedInAws ? 'Login Required' : ''}
              onKeyPress={this.props.onKeyPress}
              onClick={() => loggedInAws && this.props.onDestroyProxies()}
              data-testid={addTestId('CreateProxies.destroyProxiesButton')}
            >
              Destroy All
            </button>
          </div>
          <div className="col">
            <button
              className="proxy-options__generate"
              tabIndex={0}
              disabled={!loggedInAws}
              style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
              title={!loggedInAws ? 'Login Required' : ''}
              onKeyPress={this.props.onKeyPress}
              onClick={() => loggedInAws && this.props.onGenerateProxies(this.props.serverInfo.proxyOptions)}
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
};

export const mapStateToProps = state => ({
  serverInfo: state.serverInfo,
  serverListOptions: state.serverListOptions,
});

export const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onGenerateProxies: (options) => {
    dispatch(serverActions.generateProxies(options));
  },
  onDestroyProxies: () => {
    dispatch(serverActions.destroyProxies());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateProxiesPrimitive);
