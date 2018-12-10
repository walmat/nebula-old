import React, { Component } from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/serverDefinitions';
import { SERVER_FIELDS, serverActions } from '../state/actions';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import addTestId from '../utils/addTestId';
import { buildStyle } from '../utils/styles';

export class CreateServerPrimitive extends Component {
  static changeServerChoice(options, onChange) {
    return (event) => {
      const change = options.find(o => o.id === event.value);
      if (change) {
        onChange(change);
      }
    };
  }

  static buildServerOptionChoices(options, onFilter) {
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
    return event => this.props.onEditServerInfo(field, event);
  }

  static renderServerOptionComponent(
    tag, label, defaultOption, value,
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
                className="server-options__input--select"
                styles={colourStyles(buildStyle(disabled, null))}
                onChange={onChange}
                isDisabled={disabled}
                value={value}
                options={optionGenerator()}
                data-testid={addTestId(`CreateServer.serverOption.${tag}`)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderServerTypeComponent() {
    return CreateServerPrimitive.renderServerOptionComponent(
      'type',
      'Type',
      'Choose Server',
      this.props.serverType,
      false,
      CreateServerPrimitive.changeServerChoice(
        this.props.serverListOptions.types,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_TYPE),
      ),
      CreateServerPrimitive.buildServerOptionChoices(this.props.serverListOptions.types),
    );
  }

  renderServerSizeComponent() {
    return CreateServerPrimitive.renderServerOptionComponent(
      'size',
      'Size',
      'Choose Size',
      this.props.serverSize,
      !this.props.serverType,
      CreateServerPrimitive.changeServerChoice(
        this.props.serverListOptions.sizes,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_SIZE),
      ),
      CreateServerPrimitive.buildServerOptionChoices(
        this.props.serverListOptions.sizes,
        (s => (this.props.serverType
          ? s.types.some(t => t === this.props.serverType.id)
          : true)),
      ),
    );
  }

  renderServerLocationComponent() {
    return CreateServerPrimitive.renderServerOptionComponent(
      'location',
      'Location',
      'Choose Location',
      this.props.serverLocation,
      false,
      CreateServerPrimitive.changeServerChoice(
        this.props.serverListOptions.locations,
        this.createServerInfoChangeHandler(SERVER_FIELDS.EDIT_SERVER_LOCATION),
      ),
      CreateServerPrimitive.buildServerOptionChoices(this.props.serverListOptions.locations),
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
              onKeyPress={this.props.onKeyPress}
              onClick={() => {
                this.props.onDestroyServers(
                  this.props.servers,
                  this.props.serverInfo.credentials,
                );
              }}
              data-testid={addTestId('CreateServer.serversButton.destroy')}
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
              onKeyPress={this.props.onKeyPress}
              onClick={() => {
                this.props.onCreateServer(
                  this.props.serverInfo.serverOptions,
                  this.props.serverInfo.credentials,
                );
              }}
              data-testid={addTestId('CreateServer.serversButton.create')}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CreateServerPrimitive.propTypes = {
  servers: defns.serverList.isRequired,
  serverType: defns.serverProperty,
  serverSize: defns.serverProperty,
  serverLocation: defns.serverProperty,
  serverListOptions: defns.serverListOptions.isRequired,
  serverInfo: defns.serverInfo.isRequired,
  onEditServerInfo: PropTypes.func.isRequired,
  onCreateServer: PropTypes.func.isRequired,
  onDestroyServers: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

CreateServerPrimitive.defaultProps = {
  onKeyPress: () => {},
  serverType: null,
  serverSize: null,
  serverLocation: null,
  // eslint-disable-next-line react/default-props-match-prop-types
  errors: {}, // TODO - add proper error object
};

export const mapStateToProps = state => ({
  servers: state.servers,
  serverInfo: state.serverInfo,
  serverType: state.serverInfo.serverOptions.type || null,
  serverSize: state.serverInfo.serverOptions.size || null,
  serverLocation: state.serverInfo.serverOptions.location || null,
  serverListOptions: state.serverListOptions,
});

export const mapDispatchToProps = dispatch => ({
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateServerPrimitive);
