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
                <div className="row row--expand navbar__row-item--second">
                  <div className="col">
                    <div className="row row--start row--gutter">
                      <div className="navbar__icons--tasks">
                        <div
                          role="button"
                          tabIndex={0}
                          title="TASKS"
                          onKeyPress={onKeyPress}
                          className={
                            navbar.location === '/' || navbar.location === ROUTES.TASKS
                              ? 'active'
                              : null
                          }
                          onClick={() => {
                            onRouteTasks(history);
                          }}
                        >
                          {renderSvgIcon(TasksIcon, {
                            alt: 'tasks',
                            className: 'navbar__icons--tasks',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--gutter row--expand">
                  <div className="col col--no-gutter">
                    <div className="row">
                      <div className="navbar__icons--profils">
                        <div
                          role="button"
                          tabIndex={0}
                          title="PROFILES"
                          onKeyPress={onKeyPress}
                          className={navbar.location === ROUTES.PROFILES ? 'active' : null}
                          onClick={() => {
                            onRouteProfiles(history);
                          }}
                        >
                          {renderSvgIcon(ProfilesIcon, {
                            alt: 'profiles',
                            className: 'navbar__icons--profiles',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--gutter row--expand">
                  <div className="col col--no-gutter">
                    <div className="row">
                      <div className="navbar__icons--servers">
                        <div
                          role="button"
                          tabIndex={0}
                          title="SERVERS"
                          // title="DISABLED"
                          onKeyPress={onKeyPress}
                          className="disabled"
                          // className={navbar.location === ROUTES.SERVER ? 'active' : null}
                          // onClick={() => {
                          //   onRouteServer(history);
                          // }}
                        >
                          {renderSvgIcon(ServersIcon, {
                            alt: 'servers',
                            className: 'navbar__icons--servers',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--gutter row--expand navbar__row-item--last">
                  <div className="col col--no-gutter">
                    <div className="row">
                      <div className="navbar__icons--settings">
                        <div
                          role="button"
                          tabIndex={0}
                          title="SETTINGS"
                          onKeyPress={onKeyPress}
                          className={navbar.location === ROUTES.SETTINGS ? 'active' : null}
                          onClick={() => {
                            onRouteSettings(history);
                          }}
                        >
                          {renderSvgIcon(SettingsIcon, {
                            alt: 'settings',
                            className: 'navbar__icons--settings',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
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
  // onRouteServer: PropTypes.func.isRequired,
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
