import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import sanitizeHtml from 'sanitize-html';

import { SETTINGS_FIELDS, settingsActions } from '../state/actions';
import defns from '../utils/definitions/settingsDefinitions';

class ProxyList extends Component {
  static sanitize(dirty) {
    return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: [] });
  }

  constructor(props) {
    super(props);

    // Bind functions
    this.handleUpdate = this.handleUpdate.bind(this);
    this.focus = this.focus.bind(this);
    this.blur = this.blur.bind(this);

    // Set initial state
    this.state = {
      proxies: [],
      editing: true,
      reduxUpdate: false,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    // If we are re-rendering due to the proxy action being invoked, update the state and re-render
    if (this.state.reduxUpdate && !nextState.reduxUpdate) {
      this.setState({
        proxies: nextProps.proxies,
      });
      return true;
    }

    // re-render only if we are not editing or are changing are editing state
    return !(this.state.editing && nextState.editing);
  }

  blur(e) {
    // Check if we need to call a redux update
    if (this.state.reduxUpdate) {
      this.props.onUpdateProxies(this.state.proxies);
    }
    // Force an editing transition to color invalid proxies
    this.setState({
      editing: false,
      reduxUpdate: false,
    });
  }

  focus(e) {
    // Force an editing transition to not color invalid proxies
    this.setState({
      editing: true,
    });
  }

  handleUpdate(e) {
    // If we don't have the dom node, there's nothing to do here.
    if (!this.domNode) return;

    // TODO: Figure out a better way to do this without using innerText
    // Get the new proxies from the domNodes innerText,
    //   then mapping it to sanitized input, then removing empty lines
    const newProxies = this.domNode.innerText.trim().split('\n')
      .map(proxy => ProxyList.sanitize(proxy))
      .filter(proxy => proxy.length > 0);

    // Update the component state with newProxies and set the reduxUpdate flag
    this.setState({
      proxies: newProxies,
      reduxUpdate: true,
    });
  }

  renderProxies() {
    // If we don't have any proxies, return an empty list
    if (this.state.proxies.length === 0) {
      return '<div><br /></div>';
    }

    // If we are in editing mode, don't apply any styling
    if (this.state.editing) {
      return this.state.proxies.map(proxy => `<div>${ProxyList.sanitize(proxy)}</div>`).join('');
    }
    // Return proxies, styled in red if that proxy is invalid
    return this.state.proxies.map((proxy, idx) => `<div ${this.props.errors.includes(idx) ? 'class="invalidProxy"' : ''}>${ProxyList.sanitize(proxy)}</div>`).join('');
  }

  render() {
    const { props } = this;
    // Create a div with the innerHtml set dangerously
    // This is to allow styling, while still allowing content to be editable
    return React.createElement(
      'div',
      {
        ref: (el) => {
          if (el != null) {
            this.domNode = el;
          }
        },
        id: props.id,
        onInput: this.handleUpdate,
        onFocus: this.focus,
        onBlur: this.blur,
        dangerouslySetInnerHTML: { __html: this.renderProxies() },
        contentEditable: true,
      },
    );
  }
}

ProxyList.propTypes = {
  proxies: defns.proxies.isRequired,
  errors: defns.proxyErrors.isRequired,
  onUpdateProxies: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  proxies: state.settings.proxies,
  errors: state.settings.errors != null ? state.settings.errors.proxies : [],
});

const mapDispatchToProps = dispatch => ({
  onUpdateProxies: (data) => {
    dispatch(settingsActions.edit(SETTINGS_FIELDS.EDIT_PROXIES, data));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ProxyList);
