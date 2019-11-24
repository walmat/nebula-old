import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';

import PLATFORMS from '../constants/platforms';
import { navbarActions, ROUTES, NAVBAR_ACTIONS } from '../state/actions';

import { renderSvgIcon } from '../utils';
import Bodymovin from './components/bodymovin';
import { ReactComponent as TasksIcon } from '../styles/images/navbar/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../styles/images/navbar/profiles.svg';
import { ReactComponent as ServerIcon } from '../styles/images/navbar/server.svg';
import { ReactComponent as SettingsIcon } from '../styles/images/navbar/settings.svg';
import { mapBackgroundThemeToColor } from '../constants/themes';

import './styles/index.scss';

export class NavbarPrimitive extends PureComponent {
  static _getAppData() {
    if (window.Bridge) {
      return window.Bridge.getAppData();
    }
    return { name: 'Nebula Orion', version: null };
  }

  static _renderNavbarIconRow({ Icon, iconName, className, onClick, onKeyPress }) {
    return (
      <div key={iconName} className="row row--expand">
        <div className="col">
          <div className="row row--start row--gutter">
            <div className={`navbar__icon--${iconName}`}>
              <div
                role="button"
                tabIndex={0}
                title={iconName}
                onKeyPress={onKeyPress}
                className={className}
                onClick={onClick}
              >
                {renderSvgIcon(Icon, { alt: iconName })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  static closeAllCaptchaWindows() {
    if (window.Bridge) {
      return window.Bridge.closeAllCaptchaWindows();
    }
    // TODO - Show notification #77: https://github.com/walmat/nebula/issues/77
    console.error('Unable to close all windows');
    return null;
  }

  constructor(props) {
    super(props);

    const classNameCalc = (...supportedRoutes) => route =>
      supportedRoutes.includes(route) ? 'active' : null;
    this.defaultIconProps = {
      [NAVBAR_ACTIONS.ROUTE_TASKS]: {
        Icon: TasksIcon,
        iconName: 'tasks',
        classNameGenerator: classNameCalc(ROUTES.TASKS, '/'),
      },
      [NAVBAR_ACTIONS.ROUTE_PROFILES]: {
        Icon: ProfilesIcon,
        iconName: 'profiles',
        classNameGenerator: classNameCalc(ROUTES.PROFILES),
      },
      [NAVBAR_ACTIONS.ROUTE_SERVER]: {
        Icon: ServerIcon,
        iconName: 'server',
        classNameGenerator: classNameCalc(ROUTES.SERVER),
      },
      [NAVBAR_ACTIONS.ROUTE_SETTINGS]: {
        Icon: SettingsIcon,
        iconName: 'settings',
        classNameGenerator: classNameCalc(ROUTES.SETTINGS),
      },
    };

    this.defaultHarvesterOptions = {
      [PLATFORMS.Supreme]: {
        sitekey: '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz',
        host: 'http://supremenewyork.com',
      },
      [PLATFORMS.Shopify]: {
        sitekey: '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF',
        host: 'http://checkout.shopify.com',
      },
    }

    this.renderCaptchaHarvesterRow = this.renderCaptchaHarvesterRow.bind(this);
    this.openHarvesterWindow = this.openHarvesterWindow.bind(this);
  }

  openHarvesterWindow(host, sitekey) {
    const { theme } = this.props;
    if (window.Bridge) {
      return window.Bridge.launchCaptchaHarvester({
        backgroundColor: mapBackgroundThemeToColor[theme],
        host,
        sitekey,
      });
    }
    // TODO - Show notification #77: https://github.com/walmat/nebula/issues/77
    console.error('Unable to launch harvester!');
    return null;
  }

  renderCaptchaHarvesterRow(platform, label) {
    const { sitekey, host } = this.defaultHarvesterOptions[platform];
    return (
      <div className="row row--gutter">
        <button
          type="button"
          className="navbar__button--open-captcha"
          onClick={() => this.openHarvesterWindow(
              host,
              sitekey,
            )
          }
        >
          {label}
        </button>
      </div>
    );
  }

  renderNavbarIconRow(route, { Icon, iconName, classNameGenerator }) {
    const { onKeyPress, onRoute, location, history } = this.props;
    console.log(location.pathname);
    const className = classNameGenerator(location);
    const props = {
      Icon,
      iconName,
      onKeyPress,
      className,
      onClick: () => onRoute(route, history),
    };
    return NavbarPrimitive._renderNavbarIconRow(props);
  }

  renderNavbarIconRows() {
    return [
      NAVBAR_ACTIONS.ROUTE_TASKS,
      NAVBAR_ACTIONS.ROUTE_PROFILES,
      NAVBAR_ACTIONS.ROUTE_SERVER,
      NAVBAR_ACTIONS.ROUTE_SETTINGS,
    ].map(route => this.renderNavbarIconRow(route, this.defaultIconProps[route]));
  }

  render() {
    const { name, version } = NavbarPrimitive._getAppData();
    return (
      <div className="container navbar">
        <div className="row">
          <div className="col col--gutter">
            <div className="row row--expand">
              <div className="col col--start col--expand">
                <div className="row row--start row--gutter navbar__logo">
                  <Bodymovin />
                </div>
                <div className="col col--expand col--no-gutter navbar__icons">
                  {this.renderNavbarIconRows()}
                </div>
                {this.renderCaptchaHarvesterRow(PLATFORMS.Supreme, 'Supreme')}
                {this.renderCaptchaHarvesterRow(PLATFORMS.Shopify, 'Shopify')}
                <div className="row row--gutter">
                  <button
                    type="button"
                    className="navbar__button--close-captcha"
                    onClick={NavbarPrimitive.closeAllCaptchaWindows}
                  >
                    Close All
                  </button>
                </div>
                <div className="row navbar__text--gap">
                  <div className="col col--gutter col--expand">
                    <div className="row row--expand row--gutter">
                      <div>
                        <p className="navbar__text--app-name">{name.replace('-', ' ')}</p>
                      </div>
                    </div>
                    <div className="row row--expand row--gutter">
                      <div>
                        <p className="navbar__text--app-version">{version}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col col--no-gutter col--start">
            <div className="navbar--separator" />
          </div>
        </div>
      </div>
    );
  }
}

NavbarPrimitive.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  theme: PropTypes.string.isRequired,
  onRoute: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

NavbarPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  location: state.navbar.location,
  theme: state.theme,
});

export const mapDispatchToProps = dispatch => ({
  onRoute: (route, history) => dispatch(navbarActions.route(route, history)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withRouter(NavbarPrimitive));
