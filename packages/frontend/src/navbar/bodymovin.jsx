import bodymovin from 'bodymovin';
import React from 'react';
import PropTypes from 'prop-types';

const isDOM = window && window.document;

class Bodymovin extends React.Component {
  componentDidMount() {
    if (!isDOM) {
      return;
    }
    const { options } = this.props;
    const bodymovinOptions = { ...options };
    bodymovinOptions.wrapper = this.wrapper;
    bodymovinOptions.renderer = 'svg';
    bodymovinOptions.preserveAspectRatio = 'xMaxYMax meet';
    this.animation = bodymovin.loadAnimation(bodymovinOptions);
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
    const { children } = this.props;
    const storeWrapper = el => {
      this.wrapper = el;
    };

    return (
      <div className="react-bodymovin-container" ref={storeWrapper}>
        {children}
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
