import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import logoAnimation from './nebula.json';
import Bodymovin from './bodymovin';

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

class Navbar extends PureComponent {
  render() {
    return (
      <div className="nav-container">
        <div className="flex-column">
          <Bodymovin options={bodymovinOptions} />
          <div id="vert-line" />
          <div
            role="button"
            tabIndex={0}
            title="TASKS"
            onKeyPress={() => {}}
            className={this.props.history.location.pathname === '/' || this.props.history.location.pathname === '/tasks' ? 'active' : null}
            onClick={() => {
              this.props.history.push('/');
              // this.updateIcons();
            }}
          >
            <img src={tasks} className="main-icons" id="icon-tasks" alt="tasks" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="PROFILES"
            onKeyPress={() => {}}
            className={this.props.history.location.pathname === '/profiles' ? 'active' : null}
            onClick={() => {
              this.props.history.push('/profiles');
              // this.updateIcons();
            }}
          >
            <img src={profiles} className="main-icons" id="icon-profiles" alt="profiles" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="SERVERS"
            onKeyPress={() => {}}
            className={this.props.history.location.pathname === '/server' ? 'active' : null}
            onClick={() => {
              this.props.history.push('/server');
              // this.updateIcons();
            }}
          >
            <img src={server} className="main-icons" id="icon-server" alt="server" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            title="SETTINGS"
            onKeyPress={() => {}}
            className={this.props.history.location.pathname === '/settings' ? 'active' : null}
            onClick={() => {
              this.props.history.push('/settings');
              // this.updateIcons();
            }}
          >
            <img src={settings} className="main-icons" id="icon-settings" alt="settings" draggable="false" />
          </div>
        </div>
      </div>
    );
  }
}

Navbar.propTypes = {
  history: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default withRouter(Navbar);
