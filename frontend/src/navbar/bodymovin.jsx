import bodymovin from 'bodymovin';
import React from 'react';
import PropTypes from 'prop-types';

const isDOM = window && window.document;

class Bodymovin extends React.Component {
  componentDidMount() {
    if (!isDOM) {
      return;
    }
    const options = Object.assign({}, this.props.options);
    options.wrapper = this.wrapper;
    options.renderer = 'svg';
    options.preserveAspectRatio = 'xMaxYMax meet';
    this.animation = bodymovin.loadAnimation(options);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentWillUnmount() {
    if (!isDOM) {
      return;
    }
    this.animation.destroy();
  }

  render() {
    const storeWrapper = (el) => {
      this.wrapper = el;
    };

    return (
      <div className="react-bodymovin-container" ref={storeWrapper}>
        {this.props.children}
      </div>
    );
  }
}

Bodymovin.defaultProps = {
  children: [],
};

Bodymovin.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any),
  options: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default Bodymovin;
