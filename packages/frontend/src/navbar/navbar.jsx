import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Line } from 'rc-progress';
import { navbarActions, ROUTES, NAVBAR_ACTIONS } from '../state/actions';

import { renderSvgIcon } from '../utils';
import logoAnimation from './nebula.json';
import Bodymovin from './bodymovin';
import { ReactComponent as TasksIcon } from '../_assets/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../_assets/profiles.svg';
import { ReactComponent as ServerIcon } from '../_assets/server.svg';
import { ReactComponent as SettingsIcon } from '../_assets/settings.svg';
import { mapBackgroundThemeToColor } from '../constants/themes';
import './navbar.css';

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

export class NavbarPrimitive extends PureComponent {
  static _getAppData() {
    if (window.Bridge) {
      return window.Bridge.getAppData();
    }
    return { name: 'Nebula Orion', version: null };
  }

  static _checkForUpdates(handler) {
    if (window.Bridge) {
      return window.Bridge.checkForUpdates(handler);
    }
    return null;
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

  static openHarvesterWindow(theme) {
    if (window.Bridge) {
      return window.Bridge.launchCaptchaHarvester({ backgroundColor: mapBackgroundThemeToColor[theme] });
    } else {
      // TODO - Show notification #77: https://github.com/walmat/nebula/issues/77
      console.error('Unable to launch harvester!');
    }
  }

  static closeAllCaptchaWindows() {
    if (window.Bridge) {
      return window.Bridge.closeAllCaptchaWindows();
    } else {
      // TODO - Show notification #77: https://github.com/walmat/nebula/issues/77
      console.error('Unable to close all windows');
    }
  }

  constructor(props) {
    super(props);

    this.state = {
      error: null,
      isUpdating: false,
      progress: 0,
    }

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
  }

  updaterHandler(_, opts = {}) {
    if (opts.done) {
      this.setState({ isUpdating: false, progress: 0, error: opts.error });
    }

    if (opts.progressObj) {
      this.setState({ progress: opts.progressObj.percent });
      if (opts.progressObj.percent === 100) {
        this.setState({ isUpdating: false });
      }
    }
  }

  renderNavbarIconRow(route, { Icon, iconName, classNameGenerator }) {
    const { onKeyPress, onRoute, navbar, history } = this.props;
    const className = classNameGenerator(navbar.location);
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
    const { isUpdating, progress } = this.state;
    const { theme, onKeyPress } = this.props;
    return (
      <div className="container navbar">
        <div className="row">
          <div className="col col--gutter">
            <div className="row row--expand">
              <div className="col col--start col--expand">
                <div className="row row--start row--gutter navbar__logo">
                  <Bodymovin options={bodymovinOptions} />
                </div>
                <div className="col col--expand col--no-gutter navbar__icons">
                  {this.renderNavbarIconRows()}
                </div>
                <div className="row row--gutter">
                  <button
                    type="button"
                    className="navbar__button--open-captcha"
                    onClick={() => NavbarPrimitive.openHarvesterWindow(theme)}
                  >
                    Captcha
                  </button>
                </div>
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
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          NavbarPrimitive._checkForUpdates(this.updaterHandler);
                        }}
                        onKeyPress={onKeyPress}
                      >
                        {isUpdating ? <Line percent={progress} strokeWidth="4" strokeColor="#D3D3D3" /> : (<p className="navbar__text--app-version" title="Check for updates">
                          {version}
                        </p>)}
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
  history: PropTypes.objectOf(PropTypes.any).isRequired,
  navbar: PropTypes.objectOf(PropTypes.any).isRequired,
  theme: PropTypes.string.isRequired,
  onRoute: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

NavbarPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  navbar: state.navbar,
  theme: state.theme,
});

export const mapDispatchToProps = dispatch => ({
  onRoute: (route, history) => dispatch(navbarActions.route(route, history)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withRouter(NavbarPrimitive));
