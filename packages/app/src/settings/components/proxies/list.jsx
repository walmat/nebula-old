import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import sanitizeHtml from 'sanitize-html';
import { EOL } from 'os';

import { settingsActions, SETTINGS_FIELDS } from '../../state/actions';
import { makeProxies } from '../../state/selectors';

const sanitize = dirty => sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: [] });

export class ProxyListPrimitive extends Component {
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

  componentWillReceiveProps(nextProps) {
    const { proxies } = this.props;

    if (proxies !== nextProps.proxies) {
      this.setState({ proxies });
    }
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

    // re-render only if we are not editing or are changing our editing state
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

    const text = sanitize(data.getData('text'));

    // Perform the insert using the plain text to mimic the paste
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('paste', false, text);
    }

    // Force an update
    this.handleUpdate();
  }

  handleUpdate() {
    // If we don't have the dom node, there's nothing to do here.
    if (!this.domNode.current) return;

    // TODO: Figure out a better way to do this without using innerText
    // Get the new proxies from the domNodes innerText,
    //   then mapping it to sanitized input, then removing empty lines

    const newProxies = this.domNode.current.innerText
      .trim()
      .split(EOL)
      .map(proxy => sanitize(proxy.trim()))
      .filter(proxy => proxy.length > 0);

    // Update the component state with newProxies and set the reduxUpdate flag
    this.setState({
      proxies: newProxies,
      // editing: false,
      reduxUpdate: true,
    });
  }

  renderProxies() {
    const { proxies } = this.state;
    // If we don't have any proxies, return an empty list
    if (proxies.length === 0) {
      return '<div><br /></div>';
    }

    return proxies.map(proxy => `<div>${sanitize(proxy)}</div>`).join('');
  }

  renderDiv() {
    return React.createElement('div', {
      'data-private': true,
      ref: this.domNode,
      className: 'col col--start col--expand col--no-gutter proxy-list__input-group--text',
      onInput: this.handleUpdate,
      onFocus: this.focus,
      onBlur: this.blur,
      onPaste: this.paste,
      dangerouslySetInnerHTML: { __html: this.renderProxies() },
      contentEditable: true,
    });
  }

  render() {
    return (
      <div className="row row--start row--expand row--gutter">
        <div className="col col--start col--no-gutter-left col--expand">
          <div className="proxy-list col col--start col--expand col--no-gutter">
            <div className="row row--start row--expand row--gutter">
              <div className="col col--start col--expand proxy-list__input-group">
                <div className="row row--start row--expand row--gutter">
                  <div className="col col--start col--expand col--no-gutter">
                    {this.renderDiv()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ProxyListPrimitive.propTypes = {
  proxies: PropTypes.arrayOf(PropTypes.string).isRequired,
  onUpdateProxies: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  proxies: makeProxies(state),
});

export const mapDispatchToProps = dispatch => ({
  onUpdateProxies: data => {
    dispatch(settingsActions.editProxies(SETTINGS_FIELDS.EDIT_PROXIES, data));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProxyListPrimitive);
