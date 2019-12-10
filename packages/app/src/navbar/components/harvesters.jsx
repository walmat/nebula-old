import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeTheme } from '../../app/state/selectors';

import { Platforms, harvesterDefaults } from '../../constants';
import { openCaptchaWindow, closeWindows } from '../../constants/bridgeFns';

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
      onClick={() => openCaptchaWindow({ ...harvesterDefaults[Platforms.Supreme], theme })}
      label="Supreme"
    />
    <HarvestersRow
      className="navbar__button--open-captcha"
      onClick={() => openCaptchaWindow({ ...harvesterDefaults[Platforms.Shopify], theme })}
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
  theme: makeTheme(state),
});

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Harvesters);
