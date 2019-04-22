import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, mapServerFieldToKey, serverActions } from '../state/actions';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class AWSCredentialsPrimitive extends Component {
  constructor(props) {
    super(props);
    this.logoutAws = this.logoutAws.bind(this);
    this.validateAws = this.validateAws.bind(this);
  }

  logoutAws(e) {
    e.preventDefault();
    const message =
      'Are you sure you want to log out of AWS? Logging out will stop any currently running tasks and destroy any generated proxies/servers.';
    const { onLogoutAws, serverInfo, servers } = this.props;
    const { proxies, credentials } = serverInfo;
    window.Bridge.confirmDialog(message).then(logout => {
      if (logout) {
        onLogoutAws(servers, proxies, credentials);
      }
    });
  }

  createServerInfoChangeHandler(field) {
    const { onEditServerInfo } = this.props;
    return event => onEditServerInfo(field, event.target.value);
  }

  validateAws(e) {
    e.preventDefault();
    const { onValidateAws, serverInfo } = this.props;
    onValidateAws(serverInfo.credentials);
  }

  render() {
    const {
      serverInfo: {
        credentials: { accessToken, AWSAccessKey, AWSSecretKey },
      },
      errors,
      onKeyPress,
    } = this.props;
    const loggedInAws = accessToken != null;
    return (
      <div className="server-credentials col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col server-credentials__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="server-credentials__label">AWS Access Key</p>
                <input
                  className="server-credentials__input server-credentials__input--bordered server-credentials__input--field"
                  type="password"
                  placeholder="IAM User Access"
                  disabled={loggedInAws}
                  style={buildStyle(
                    false,
                    errors[mapServerFieldToKey[SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]],
                  )}
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  value={AWSAccessKey}
                  required
                  data-testid={addTestId('AWSCredentials.accessKeyInput')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col server-credentials__input-group">
          <div className="row row--gutter">
            <div className="col col--no-gutter">
              <p className="server-credentials__label">AWS Secret Key</p>
              <input
                className="server-credentials__input server-credentials__input--bordered server-credentials__input--field"
                type="password"
                placeholder="IAM User Secret"
                disabled={loggedInAws}
                style={buildStyle(
                  false,
                  errors[mapServerFieldToKey[SERVER_FIELDS.EDIT_AWS_SECRET_KEY]],
                )}
                onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                value={AWSSecretKey}
                required
                data-testid={addTestId('AWSCredentials.secretKeyInput')}
              />
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              type="button"
              className="server-credentials__submit"
              tabIndex={0}
              onKeyPress={onKeyPress}
              onClick={loggedInAws ? this.logoutAws : this.validateAws}
              data-testid={addTestId('AWSCredentials.submitButton')}
            >
              {loggedInAws ? 'Log out' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

AWSCredentialsPrimitive.propTypes = {
  servers: defns.serverList.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onValidateAws: PropTypes.func.isRequired,
  onLogoutAws: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  errors: PropTypes.objectOf(PropTypes.any),
};

AWSCredentialsPrimitive.defaultProps = {
  onKeyPress: () => {},
  // eslint-disable-next-line react/default-props-match-prop-types
  errors: {}, // TODO - add proper error object
};

export const mapStateToProps = state => ({
  serverInfo: state.serverInfo,
  servers: state.servers,
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
