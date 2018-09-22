import React, { Component } from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';

class CreateServer extends Component {
  static changeServerChoice(options, onChange) {
    return (event) => {
      const change = options.find(o => o.id === event.value);
      onChange(change);
    };
  }

  static buildServerTypeChoices(options, onFilter) {
    return () => {
      if (!options) {
        return options;
      }
      const filtered = onFilter ? options.filter(onFilter) : options;
      return filtered.map(o => ({ value: o.id, label: o.label }));
    };
  }

  constructor(props) {
    super(props);
    this.createServerInfoChangeHandler = this.createServerInfoChangeHandler.bind(this);
  }

  createServerInfoChangeHandler(field) {
    return event => this.props.onEditServerInfo(field, event.target ? event.target.value : event);
  }

  createServer(e) {
    e.preventDefault();
    this.props.onCreateServer(
      this.props.serverInfo.serverOptions,
      this.props.serverInfo.credentials,
    );
  }

  static renderServerOptionComponent(
    type, label, defaultOption, value,
    disabled, onChange, optionGenerator,
  ) {
    return (
      <div className="row row--start row--gutter">
        <div className="col server-options__input-group">
          <div className="row row--gutter">
            <div className="col col--no-gutter">
              <p className="server-options__label">{label}</p>
              <Select
                required
                placeholder={defaultOption}
                components={{ DropdownIndicator }}
                classNamePrefix="select"
                className="server-options__select--type"
                styles={colourStyles}
                onChange={onChange}
                isDisabled={disabled}
                value={value}
                options={optionGenerator()}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderServerTypeComponent() {
    return CreateServer.renderServerOptionComponent(
      'type',
      'Type',
      'Choose Server',
      this.props.serverType,
      false,
      CreateServer.changeServerChoice(
        this.props.serverListOptions.types,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_TYPE),
      ),
      CreateServer.buildServerTypeChoices(this.props.serverListOptions.types),
    );
  }

  renderServerSizeComponent() {
    return CreateServer.renderServerOptionComponent(
      'size',
      'Size',
      'Choose Size',
      this.props.serverSize,
      !this.props.serverType,
      CreateServer.changeServerChoice(
        this.props.serverListOptions.sizes,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_SIZE),
      ),
      CreateServer.buildServerTypeChoices(
        this.props.serverListOptions.sizes,
        (s => (this.props.serverType
          ? s.types.some(t => t === this.props.serverType.id)
          : true)),
      ),
    );
  }

  renderServerLocationComponent() {
    return CreateServer.renderServerOptionComponent(
      'location',
      'Location',
      'Choose Location',
      this.props.serverLocation,
      false,
      CreateServer.changeServerChoice(
        this.props.serverListOptions.locations,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_LOCATION),
      ),
      CreateServer.buildServerTypeChoices(this.props.serverListOptions.locations),
    );
  }

  render() {
    const loggedInAws = this.props.serverInfo.credentials.accessToken != null;
    return (
      <div className="server-options col col--start col--no-gutter">
        {this.renderServerTypeComponent()}
        {this.renderServerSizeComponent()}
        {this.renderServerLocationComponent()}
        <div className="row row--end row--expand row--gutter">
          <div className="col">
            <button
              className="server-options__destroy"
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
              className="server-options__create"
              tabIndex={0}
              disabled={!loggedInAws}
              style={!loggedInAws ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
              title={!loggedInAws ? 'Login Required' : ''}
              onKeyPress={() => {}}
              onClick={this.generateProxies}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateServer.propTypes = {
  onEditServerInfo: PropTypes.func.isRequired,
  onCreateServer: PropTypes.func.isRequired,
  serverType: defns.serverType,
  serverSize: defns.serverSize,
  serverLocation: defns.serverLocation,
  serverListOptions: defns.serverListOptions.isRequired,
  serverInfo: defns.serverInfo.isRequired,
};


const mapStateToProps = (state, ownProps) => ({
  serverInfo: state.serverInfo,
  serverType: state.serverInfo.serverOptions.type || null,
  serverSize: state.serverInfo.serverOptions.size || null,
  serverLocation: state.serverInfo.serverOptions.location || null,
  serverListOptions: state.serverListOptions,
  onCreateServer: PropTypes.func.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
  onDestroyServers: PropTypes.func.isRequired,
});

const mapDispatchToProps = dispatch => ({
  onEditServerInfo: (field, value) => {
    dispatch(serverActions.edit(null, field, value));
  },
  onCreateServer: (serverOptions, awsCredentials) => {
    dispatch(serverActions.create(serverOptions, awsCredentials));
  },
  onDestroyServers: (servers, awsCredentials) => {
    dispatch(serverActions.destroyAll(servers, awsCredentials));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateServer);
