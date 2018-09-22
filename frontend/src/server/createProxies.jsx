import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';

class CreateProxies extends Component {

  static limit(val, max) {
    if (val.length === 1 && val[0] > max[0]) {
      val = `0${val}`;
    }

    if (val.length === 2) {
      if (Number(val) === 0) {
        val = '01';
      } else if (val > max) { // this can happen when user paste number
        val = max;
      }
    }
    return val;
  }

  constructor(props) {
    super(props);
    this.destroyProxies = this.destroyProxies.bind(this);
  }

  destroyProxies(e) {
    e.preventDefault();
    this.props.onDestroyProxies();
  }

  generateProxies(e) {
    e.preventDefault();
    this.props.onGenerateProxies(this.props.serverInfo.proxyOptions);
  }

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
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
                  value={serverInfo.proxyOptions.numProxies}
                  format="##"
                  placeholder="00"
                  className="proxy-options__input proxy-options__input--bordered proxy-options__input--number"
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_NUMBER)}
                  required
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
                  type="test"
                  placeholder="Desired Password"
                  onChange={this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_PROXY_PASSWORD)}
                  value={serverInfo.proxyOptions.password}
                  required
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
              onKeyPress={() => {}}
              onClick={this.destroyProxies}
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
              onKeyPress={() => {}}
              onClick={this.generateProxies}
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateProxies.propTypes = {
  onEditServerInfo: PropTypes.func.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onGenerateProxies: PropTypes.func.isRequired,
};


const mapStateToProps = (state, ownProps) => ({
  serverInfo: state.serverInfo,
  onDestroyProxies: PropTypes.func.isRequired,
  onGenerateProxies: PropTypes.func.isRequired,
});

const mapDispatchToProps = dispatch => ({
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateProxies);
