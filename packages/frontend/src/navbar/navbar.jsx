import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
// import server from '../_assets/server.svg';
import serverDisabled from '../_assets/server-disabled.svg';
import settings from '../_assets/settings.svg';
import logoAnimation from './nebula.json';
import Bodymovin from './bodymovin';

import { navbarActions, ROUTES } from '../state/actions';

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
      // onRouteServer,
      onRouteSettings,
    } = this.props;
    const { name, version } = NavbarPrimitive._getAppData();

    return (
      <div className="container navbar">
        {/* <div className="navbar separator" /> */}
        <div className="col col--start">
          <div className="row--start">
            <div className="col col--between">
              <Bodymovin options={bodymovinOptions} />
            </div>
          </div>
          <div className="row--tasks">
            <div className="col col--between">
              <div className="row row--around">
                <div className="icons icons--tasks">
                  <div
                    role="button"
                    tabIndex={0}
                    title="TASKS"
                    onKeyPress={onKeyPress}
                    className={
                      navbar.location === '/' || navbar.location === ROUTES.TASKS ? 'active' : null
                    }
                    onClick={() => {
                      onRouteTasks(history);
                    }}
                  >
                    <img
                      src={tasks}
                      className="main-icons__tasks"
                      id="icon-tasks"
                      alt="tasks"
                      draggable="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row--profiles">
            <div className="col col--between">
              <div className="row row--around">
                <div className="icons icons--profiles">
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
                    <img
                      src={profiles}
                      className="main-icons"
                      id="icon-profiles"
                      alt="profiles"
                      draggable="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row--servers">
            <div className="col col--between">
              <div className="row row--around">
                <div className="icons icons--servers">
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
                    <img
                      src={serverDisabled}
                      className="main-icons"
                      id="icon-server"
                      alt="server"
                      draggable="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row--settings">
            <div className="col col--between">
              <div className="row row--around">
                <div className="icons icons--settings">
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
                    <img
                      src={settings}
                      className="main-icons"
                      id="icon-settings"
                      alt="settings"
                      draggable="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row row--end">
            <div className="col col--between">
              <div className="row row--start">
                <div className="app__name">
                  <p>{name.replace('-', ' ')}</p>
                </div>
              </div>
              <div className="row row--end">
                <div className="app__version">
                  <p>{version}</p>
                </div>
              </div>
            </div>
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
