import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import tasksActive from '../_assets/tasks-active.svg';
import profilesActive from '../_assets/profiles-active.svg';
import serverActive from '../_assets/server-active.svg';
import settingsActive from '../_assets/settings-active.svg';
import logout from '../_assets/logout.svg';
import info from '../_assets/info-bot.svg';
import deactivate from '../_assets/Pause_Bot_icon-01.svg';
import logoAnimation from './nebula.json';
import './navbar.css';
import Bodymovin from './bodymovin';

// const bodymovinOptions = {
//     loop: true,
//     autoplay: true,
//     prerender: true,
//     animationData: logoAnimation
// }


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

class Navbar extends Component {
  /**
   * send the 'close' signal to the bot
   * ### this will not de-authenticate the user!!!!
   * AKA:: they won't see the auth screen upon next launch
   */
  static async closeBot() {
    if (window.Bridge) {
      window.Bridge.quit();
    } else {
      console.error('Unable to quit!');
    }
  }

  /**
   * send the 'deactivate' signal to the bot.
   * The user will need to authenticate their license key again,
   * so the next time they launch the bot they will see the auth screen
   *
   * Also, this should clear the database of ALL traces of their data
   * except from the 'users' table
   */
  static async deactivate() {
    // TODO – de-auth user and show auth screen upon next launch
  }

  static async launchInfo() {
    // window.open("http://bot-nebula.herokuapp.com");
    // TODO – launch a child window to website
  }

  constructor(props) {
    super(props);

    this.state = {
      icons: {
        tasksIcon: tasks,
        profilesIcon: profiles,
        serverIcon: server,
        settingsIcon: settings,
      },
    };
    this.updateIcons = this.updateIcons.bind(this);
  }

  componentDidMount() {
    this.updateIcons();
  }

  updateIcons() {
    const currentLocation = this.props.history.location.pathname;
    const { icons } = this.state;
    if (currentLocation === '/' || currentLocation === '/tasks') {
      icons.tasksIcon = tasksActive;
      icons.profilesIcon = profiles;
      icons.serverIcon = server;
      icons.settingsIcon = settings;
    } else if (currentLocation === '/profiles') {
      icons.tasksIcon = tasks;
      icons.profilesIcon = profilesActive;
      icons.serverIcon = server;
      icons.settingsIcon = settings;
    } else if (currentLocation === '/server') {
      icons.tasksIcon = tasks;
      icons.profilesIcon = profiles;
      icons.serverIcon = serverActive;
      icons.settingsIcon = settings;
    } else if (currentLocation === '/settings') {
      icons.tasksIcon = tasks;
      icons.profilesIcon = profiles;
      icons.serverIcon = server;
      icons.settingsIcon = settingsActive;
    }
    this.setState({
      icons,
    });
  }

  render() {
    const { icons } = this.state;
    return (
      <div className="nav-container">
        <div className="flex-column">
          <Bodymovin options={bodymovinOptions} />
          <div id="vert-line" />
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => {
              this.props.history.push('/');
              this.updateIcons();
            }}
          >
            <img src={icons.tasksIcon} className="main-icons" id="icon-tasks" alt="tasks" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => {
              this.props.history.push('/profiles');
              this.updateIcons();
            }}
          >
            <img src={icons.profilesIcon} className="main-icons" id="icon-profiles" alt="profiles" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => {
              this.props.history.push('/server');
              this.updateIcons();
            }}
          >
            <img src={icons.serverIcon} className="main-icons" id="icon-server" alt="server" draggable="false" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={() => {
              this.props.history.push('/settings');
              this.updateIcons();
            }}
          >
            <img src={icons.settingsIcon} className="main-icons" id="icon-settings" alt="settings" draggable="false" />
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={Navbar.launchInfo}
          >
            <img src={info} id="icon-information" alt="information" draggable="false" />
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={Navbar.closeBot}
          >
            <img src={logout} id="icon-deactivate" alt="logout" draggable="false" />
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyPress={() => {}}
            onClick={Navbar.deactivate}
          >
            <img src={deactivate} id="icon-logout" alt="deactivate" draggable="false" />
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
