import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import sanitizeHtml from 'sanitize-html';

import { SETTINGS_FIELDS, settingsActions } from '../state/actions';
import defns from '../utils/definitions/settingsDefinitions';

export class ProxyListPrimitive extends Component {
  static sanitize(dirty) {
    return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: [] });
  }

  constructor(props) {
    super(props);

    // ref
    this.domNode = React.createRef();

    // Bind functions
    this.handleUpdate = this.handleUpdate.bind(this);
    this.focus = this.focus.bind(this);
    this.blur = this.blur.bind(this);
    this.paste = this.paste.bind(this);

    // Set initial state
    this.state = {
      proxies: props.proxies,
      editing: false,
      reduxUpdate: false,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { reduxUpdate, editing } = this.state;
    // If we are re-rendering due to the proxy action being invoked, update the state and re-render
    if (reduxUpdate && !nextState.reduxUpdate) {
      this.setState({
        proxies: nextProps.proxies,
      });
      return true;
    }

    // re-render only if we are not editing or are changing are editing state
    return !(editing && nextState.editing);
  }

  blur() {
    const { onUpdateProxies } = this.props;
    const { reduxUpdate, proxies } = this.state;
    // Check if we need to call a redux update
    if (reduxUpdate) {
      onUpdateProxies(proxies.map(proxy => proxy.trim()));
    }
    // Force an editing transition to color invalid proxies
    this.setState({
      editing: false,
      reduxUpdate: false,
    });
  }

  focus() {
    // Force an editing transition to not color invalid proxies
    this.setState({
      editing: true,
    });
  }

  paste(e) {
    // Prevent default and event propagation
    e.preventDefault();
    e.stopPropagation();

    // Get the clipboard data and sanitize the text
    const data = e.clipboardData || window.clipboardData;

    console.log(data.getData('text'));
    const text = ProxyListPrimitive.sanitize(data.getData('text'));

    // Perform the insert using the plain text to mimic the paste
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('paste', false, text);
    }

    // Force an update
    this.handleUpdate(null);
  }

  handleUpdate() {
    // If we don't have the dom node, there's nothing to do here.
    if (!this.domNode.current) return;

    // TODO: Figure out a better way to do this without using innerText
    // Get the new proxies from the domNodes innerText,
    //   then mapping it to sanitized input, then removing empty lines

    const newProxies = this.domNode.current.innerText
      .trim()
      .split('\n')
      .map(proxy => ProxyListPrimitive.sanitize(proxy.trim()))
      .filter(proxy => proxy.length > 0);

    // Update the component state with newProxies and set the reduxUpdate flag
    this.setState({
      proxies: newProxies,
      reduxUpdate: true,
    });
  }

  renderProxies() {
    const { errors } = this.props;
    const { editing, proxies } = this.state;
    // If we don't have any proxies, return an empty list
    if (proxies.length === 0) {
      return '<div><br /></div>';
    }

    // If we are in editing mode, don't apply any styling
    if (editing) {
      return proxies.map(proxy => `<div>${ProxyListPrimitive.sanitize(proxy)}</div>`).join('');
    }
    // Return proxies, styled in red if that proxy is invalid
    return proxies
      .map(
        (proxy, idx) =>
          `<div${errors.includes(idx) ? ' class="invalidProxy"' : ''}>${ProxyListPrimitive.sanitize(
            proxy,
          )}</div>`,
      )
      .join('');
  }

  render() {
    const { id } = this.props;
    // Create a div with the innerHtml set dangerously
    // This is to allow styling, while still allowing content to be editable
    return React.createElement('div', {
      ref: this.domNode,
      id,
      onInput: this.handleUpdate,
      onFocus: this.focus,
      onBlur: this.blur,
      onPaste: this.paste,
      dangerouslySetInnerHTML: { __html: this.renderProxies() },
      contentEditable: true,
    });
  }
}

ProxyListPrimitive.propTypes = {
  id: PropTypes.string,
  proxies: PropTypes.arrayOf(defns.proxy).isRequired,
  errors: defns.proxyErrors.isRequired,
  onUpdateProxies: PropTypes.func.isRequired,
};

ProxyListPrimitive.defaultProps = {
  id: 'proxyList',
};

export const mapStateToProps = state => ({
  proxies: state.settings.proxies,
  errors: state.settings.errors.proxies ? state.settings.errors.proxies : [],
});

export const mapDispatchToProps = dispatch => ({
  onUpdateProxies: data => {
    dispatch(settingsActions.edit(SETTINGS_FIELDS.EDIT_PROXIES, data));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProxyListPrimitive);
