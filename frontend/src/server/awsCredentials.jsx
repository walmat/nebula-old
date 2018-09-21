import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';

class AWSCredentials extends Component {
  constructor(props) {
    super(props);
    this.logoutAws = this.logoutAws.bind(this);
    this.validateAws = this.validateAws.bind(this);
  }

  logoutAws(e) {
    e.preventDefault();
    const message = 'Are you sure you want to log out of AWS? Logging out will stop any currently running tasks and destroy any generated proxies/servers.';
    window.Bridge.confirmDialog(message).then((logout) => {
      if (logout) {
        this.props.onLogoutAws(this.props.serverInfo.coreServer.path);
      }
    });
  }

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
  }

  validateAws(e) {
    e.preventDefault();
    this.props.onValidateAws(this.props.serverInfo.credentials);
  }

  render() {
    const { serverInfo } = this.props;
    const loggedInAws = this.props.serverInfo.credentials.accessToken != null;
    return (
      <div className="server-credentials col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col server-credentials__input-group">
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <p className="server-credentials__label">AWS Access Key</p>
                <input
                  className="server-credentials__input server-credentials__input--bordered server-credentials__input--field"
                  type="text"
                  placeholder="CHANGE THIS"
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_ACCESS_KEY)}
                  value={serverInfo.credentials.AWSAccessKey}
                  required
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
                placeholder="CHANGE THIS"
                onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_AWS_SECRET_KEY)}
                value={serverInfo.credentials.AWSSecretKey}
                required
              />
            </div>
          </div>
        </div>
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              className="server-credentials__submit"
              tabIndex={0}
              onKeyPress={() => {}}
              onClick={loggedInAws ? this.logoutAws : this.validateAws}
            >
              {loggedInAws ? 'Log out' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

AWSCredentials.propTypes = {
  onEditServerInfo: PropTypes.func.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onValidateAws: PropTypes.func.isRequired,
  onLogoutAws: PropTypes.func.isRequired,
};


const mapStateToProps = (state, ownProps) => ({
  serverInfo: state.serverInfo,
});

const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onValidateAws: (credentials) => {
    dispatch(serverActions.validateAws(credentials));
  },
  onLogoutAws: (path) => {
    dispatch(serverActions.logoutAws(path));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(AWSCredentials);
