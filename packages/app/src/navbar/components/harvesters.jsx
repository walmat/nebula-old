import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import PLATFORMS from '../../constants/platforms';
import { mapBackgroundThemeToColor } from '../../constants/themes';

const defaultHarvesterOptions = {
  [PLATFORMS.Supreme]: {
    sitekey: '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz',
    host: 'http://supremenewyork.com',
  },
  [PLATFORMS.Shopify]: {
    sitekey: '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF',
    host: 'http://checkout.shopify.com',
  },
};

const openCaptchaWindow = ({ host, sitekey, theme }) => {
  if (window.Bridge) {
    return window.Bridge.launchCaptchaHarvester({
      backgroundColor: mapBackgroundThemeToColor[theme],
      host,
      sitekey,
    });
  }
  console.error('Unable to open harvester!');
  return null;
};

const closeWindows = () => {
  if (window.Bridge) {
    return window.Bridge.closeAllCaptchaWindows();
  }
  console.error('Unable to close all harvesters!');
  return null;
};

const HarvestersRow = ({ className, onClick, label }) => (
  <div className="row row--gutter">
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  </div>
);

HarvestersRow.propTypes = {
  className: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

const Harvesters = ({ theme }) => (
  <>
    <HarvestersRow
      className="navbar__button--open-captcha"
      onClick={() => openCaptchaWindow({ ...defaultHarvesterOptions[PLATFORMS.Supreme], theme })}
      label="Supreme"
    />
    <HarvestersRow
      className="navbar__button--open-captcha"
      onClick={() => openCaptchaWindow({ ...defaultHarvesterOptions[PLATFORMS.Shopify], theme })}
      label="Shopify"
    />
    <HarvestersRow
      className="navbar__button--close-captcha"
      onClick={() => closeWindows()}
      label="Close All"
    />
  </>
);

Harvesters.propTypes = {
  theme: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
  theme: state.App.theme,
});

const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Harvesters);
