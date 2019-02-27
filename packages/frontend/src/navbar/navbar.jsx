import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { navbarActions, ROUTES } from '../state/actions';

import { renderSvgIcon } from '../utils';
import logoAnimation from './nebula.json';
import Bodymovin from './bodymovin';
// import server from '../_assets/server.svg'; // TODO - when server page is finished
import { ReactComponent as TasksIcon } from '../_assets/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../_assets/profiles.svg';
import { ReactComponent as ServersIcon } from '../_assets/server-disabled.svg';
import { ReactComponent as SettingsIcon } from '../_assets/settings.svg';
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

  static renderNavbarIcon(title, onKeyPress, className, onClick, icon) {
    return (
      <div
        role="button"
        tabIndex={0}
        title={title}
        onKeyPress={onKeyPress}
        className={className}
        onClick={onClick}
      >
        {renderSvgIcon(icon, { alt: title, className: `navbar__icons--${title}` })}
      </div>
    );
  }

  static renderNavbarIconRow(index, name, onKeyPress, className, onClick, icon) {
    return (
      <div className={`row row--expand navbar__row-item--${index}`}>
        <div className="col">
          <div className="row row--start row--gutter">
            <div className={`navbar__icons--${name}`}>
              {NavbarPrimitive.renderNavbarIcon(name, onKeyPress, className, onClick, icon)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {
      history,
      navbar,
      onKeyPress,
      onRouteTasks,
      onRouteProfiles,
      // onRouteServer, // TODO - when server page is finished
      onRouteSettings,
    } = this.props;
    const { name, version } = NavbarPrimitive._getAppData();

    return (
      <div className="container navbar">
        <div className="row">
          <div className="col col--gutter">
            <div className="row row--expand">
              <div className="col col--start col--expand">
                <div className="row row--start row--gutter navbar__row-item--first">
                  <Bodymovin options={bodymovinOptions} />
                </div>
                {NavbarPrimitive.renderNavbarIconRow(
                  'second',
                  'tasks',
                  onKeyPress,
                  navbar.location === '/' || navbar.location === ROUTES.TASKS ? 'active' : null,
                  () => onRouteTasks(history),
                  TasksIcon,
                )}
                {NavbarPrimitive.renderNavbarIconRow(
                  '',
                  'profiles',
                  onKeyPress,
                  navbar.location === ROUTES.PROFILES ? 'active' : null,
                  () => onRouteProfiles(history),
                  ProfilesIcon,
                )}
                {NavbarPrimitive.renderNavbarIconRow(
                  '',
                  'servers',
                  onKeyPress,
                  navbar.location === ROUTES.SERVER ? 'active' : null,
                  () => {},
                  ServersIcon,
                )}
                {NavbarPrimitive.renderNavbarIconRow(
                  'last',
                  'settings',
                  onKeyPress,
                  navbar.location === ROUTES.SETTINGS ? 'active' : null,
                  () => onRouteSettings(history),
                  SettingsIcon,
                )}
                <div className="row">
                  <div className="col col--no-gutter">
                    <div className="row row--start">
                      <div>
                        <p className="navbar__text--app-name">{name.replace('-', ' ')}</p>
                      </div>
                    </div>
                    <div className="row row--end">
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
  history: PropTypes.objectOf(PropTypes.any).isRequired,
  navbar: PropTypes.objectOf(PropTypes.any).isRequired,
  onRouteTasks: PropTypes.func.isRequired,
  onRouteProfiles: PropTypes.func.isRequired,
  // onRouteServer: PropTypes.func.isRequired, // TODO - when server page is finished
  onRouteSettings: PropTypes.func.isRequired,
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
  onRouteTasks: history => dispatch(navbarActions.routeTasks(history)),
  onRouteProfiles: history => dispatch(navbarActions.routeProfiles(history)),
  onRouteServer: history => dispatch(navbarActions.routeServer(history)),
  onRouteSettings: history => dispatch(navbarActions.routeSettings(history)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withRouter(NavbarPrimitive));
