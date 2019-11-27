import bodymovin from 'bodymovin';
import React from 'react';
import PropTypes from 'prop-types';

import logoAnimation from '../styles/nebula.json';

const isDOM = window && window.document;

export default class Bodymovin extends React.Component {
  componentDidMount() {
    if (!isDOM) {
      return;
    }

    const bodymovinOptions = {
      loop: true,
      autoplay: true,
      prerender: true,
      animationData: logoAnimation,
      rendererSettings: {
        progressiveLoad: false,
        preserveAspectRatio: 'xMidYMid slice',
      },
    };

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
};
