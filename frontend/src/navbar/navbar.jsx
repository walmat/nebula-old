import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
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
    return null;
  }

  render() {
    const { history, navbar, onKeyPress } = this.props;
    const { name, version } = NavbarPrimitive._getAppData();

    return (
      <div className="nav-container">
        <div className="flex-column">
          <Bodymovin options={bodymovinOptions} />
          <div id="vert-line" />
          <div
            role="button"
            tabIndex={0}
            title="TASKS"
            onKeyPress={onKeyPress}
            className={navbar.location === '/' || navbar.location === ROUTES.TASKS ? 'active' : null}
            onClick={() => {
              this.props.onRouteTasks(history);
            }}
          >
            <img src={tasks} className="main-icons" id="icon-tasks" alt="tasks" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="PROFILES"
            onKeyPress={onKeyPress}
            className={navbar.location === ROUTES.PROFILES ? 'active' : null}
            onClick={() => {
              this.props.onRouteProfiles(history);
            }}
          >
            <img src={profiles} className="main-icons" id="icon-profiles" alt="profiles" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="SERVERS"
            onKeyPress={onKeyPress}
            className={navbar.location === ROUTES.SERVER ? 'active' : null}
            onClick={() => {
              this.props.onRouteServer(history);
            }}
          >
            <img src={server} className="main-icons" id="icon-server" alt="server" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="SETTINGS"
            onKeyPress={onKeyPress}
            className={navbar.location === ROUTES.SETTINGS ? 'active' : null}
            onClick={() => {
              this.props.onRouteSettings(history);
            }}
          >
            <img src={settings} className="main-icons" id="icon-settings" alt="settings" draggable="false" />
          </div>
          <div className="appName">
            <p>{ name.replace('-', ' ')}</p>
          </div>
          <div className="appVersion">
            <p>{ version }</p>
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
  onRouteServer: PropTypes.func.isRequired,
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

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(NavbarPrimitive));
