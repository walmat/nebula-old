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

  _renderNavbarIconRow({ iconName, className, onClick, Icon }) {
    const { onKeyPress } = this.props;
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

  renderNavbarIconRow(route, otherParams = {}) {
    const renderParams = {
      ...route,
      ...otherParams,
    };
    return this._renderNavbarIconRow({ ...renderParams });
  }

  renderNavbarIconRows() {
    return this.routes.map(route => this.renderNavbarIconRow(route));
  }

  render() {
    const { name, version } = NavbarPrimitive._getAppData();
    const {
      navbar,
      history,
      onRouteTasks,
      onRouteProfiles,
      // onRouteServer, // TODO - move this back in once servers page is done
      onRouteSettings,
    } = this.props;

    this.routes = [
      {
        Icon: TasksIcon,
        className: navbar.location === '/' || navbar.location === ROUTES.TASKS ? 'active' : null,
        iconName: 'tasks',
        onClick: () => onRouteTasks(history),
      },
      {
        Icon: ProfilesIcon,
        className: navbar.location === ROUTES.PROFILES ? 'active' : null,
        iconName: 'profiles',
        onClick: () => onRouteProfiles(history),
      },
      {
        Icon: ServersIcon,
        className: navbar.location === ROUTES.SERVER ? 'active' : null,
        iconName: 'servers',
        onClick: () => {},
        // onClick: () => onRouteServer(history), // TODO - move this back in once servers page is done
      },
      {
        Icon: SettingsIcon,
        className: navbar.location === ROUTES.SETTINGS ? 'active' : null,
        iconName: 'settings',
        onClick: () => onRouteSettings(history),
      },
    ];

    return (
      <div className="container navbar">
        <div className="row">
          <div className="col col--gutter">
            <div className="row row--expand">
              <div className="col col--start col--expand navbar__logo">
                <div className="row row--start row--gutter">
                  <Bodymovin options={bodymovinOptions} />
                </div>
                <div className="col col--expand col--no-gutter navbar__icons">
                  {this.renderNavbarIconRows()}
                </div>
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
