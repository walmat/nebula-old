import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { sortBy, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import Routes from '../routes';
import Navbar from '../navbar';
import { withReducer } from '../state/withReducer';
import reducers from '../state/reducers/app';
import { reset, setTheme, fetchSites, stopAllTasks, updateTaskStatus } from '../state/actions';
import { makeTasks, makeTheme } from '../state/selectors/app';
import { THEMES, mapBackgroundThemeToColor, mapToNextTheme } from '../constants/themes';

import { addTestId, renderSvgIcon } from '../utils';

/* SVGS */
import { ReactComponent as CloseIcon } from '../styles/images/app/close.svg';
import { ReactComponent as DeactivateIcon } from '../styles/images/app/logout.svg';
import { ReactComponent as MinimizeIcon } from '../styles/images/app/minimize.svg';
import { ReactComponent as NightModeIcon } from '../styles/images/app/moon.svg';
import { ReactComponent as LightModeIcon } from '../styles/images/app/sun.svg';

/* CSS */
import '../styles/index.scss';

class App extends Component {
  static close(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.close();
    }
  }

  static minimize(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.minimize();
    }
  }

  constructor(props) {
    super(props);
    this.taskHandler = this.taskHandler.bind(this);
    this._cleanup = this._cleanup.bind(this);

    this.siteInterval = null;
  }

  componentDidMount() {
    if (window.Bridge) {
      const { theme } = this.props;
      const backgroundColor = mapBackgroundThemeToColor[theme];
      window.Bridge.setTheme({ backgroundColor });
      window.Bridge.registerForTaskEvents(this.taskHandler);
    }
    this.fetchSites();
    this.siteInterval = setInterval(() => this.fetchSites(), 5000);
    window.addEventListener('beforeunload', this._cleanup);
  }

  componentWillUnmount() {
    this._cleanup();
    clearInterval(this.siteInterval);
    this.siteInterval = null;
    window.removeEventListener('beforeunload', this._cleanup);
  }

  deactivate() {
    const { _reset } = this.props;
    return async e => {
      e.preventDefault();
      if (window.Bridge) {
        const confirm = await window.Bridge.showDialog(
          'Are you sure you want to deactivate? Doing so will erase all data!',
          'question',
          ['Okay', 'Cancel'],
          'Confirm',
        );
        if (confirm) {
          _reset();
          window.Bridge.deactivate();
        }
      }
    };
  }

  setTheme() {
    const { theme, _setTheme } = this.props;
    const nextTheme = mapToNextTheme[theme] || THEMES.LIGHT;
    _setTheme(nextTheme);
    if (window.Bridge) {
      const backgroundColor = mapBackgroundThemeToColor[nextTheme];
      window.Bridge.setTheme({ backgroundColor });
    }
    this.forceUpdate();
  }

  taskHandler(_, statusMessageBuffer) {
    const { _updateTaskStatus } = this.props;
    if (!isEmpty(statusMessageBuffer)) {
      _updateTaskStatus(statusMessageBuffer);
    }
  }

  _cleanup() {
    this._cleanupTaskLog();
    this._cleanupTaskEvents();
  }

  _cleanupTaskLog() {
    const { tasks, _stopAllTasks } = this.props;
    tasks.forEach(t => {
      if (t.status !== 'stopped' || t.status !== 'idle') {
        _stopAllTasks(t);
      }
    });
  }

  _cleanupTaskEvents() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
  }

  async fetchSites() {
    const { _fetchSites } = this.props;
    try {
      const res = await fetch(`https://nebula-orion-api.herokuapp.com/sites`);

      if (!res.ok) {
        return;
      }

      const sites = await res.json();

      if (sites && sites.length) {
        const sorted = sortBy(sites, site => site.index);
        _fetchSites({ ...sorted });
      }
      return;
    } catch (error) {
      return;
    }
  }

  render() {
    const { onKeyPress, theme } = this.props;

    return (
      <div id="container-wrapper" className={`theme-${theme}`}>
        <div className="titlebar">
          <div
            className="deactivate-button"
            role="button"
            tabIndex={0}
            title="deactivate"
            onKeyPress={onKeyPress}
            onClick={() => this.deactivate}
            draggable="false"
            data-testid={addTestId('App.button.deactivate')}
          >
            {renderSvgIcon(DeactivateIcon, {
              alt: '',
              style: { marginTop: '6px', marginLeft: '6px' },
            })}
          </div>
          <div
            className="minimize-button"
            role="button"
            tabIndex={0}
            title="minimize"
            onKeyPress={onKeyPress}
            onClick={() => App.minimize}
            draggable="false"
            data-testid={addTestId('App.button.minimize')}
          >
            {renderSvgIcon(MinimizeIcon)}
          </div>
          <div
            className="close-button"
            role="button"
            tabIndex={0}
            title="close"
            onKeyPress={onKeyPress}
            onClick={() => App.close}
            draggable="false"
            data-testid={addTestId('App.button.close')}
          >
            {renderSvgIcon(CloseIcon, {
              alt: '',
              style: { marginTop: '6px', marginLeft: '6px' },
            })}
          </div>
          <div
            className="theme-icon"
            role="button"
            tabIndex={0}
            title="theme"
            onKeyPress={onKeyPress}
            onClick={() => this.setTheme}
            draggable="false"
            data-testid={addTestId('App.button.theme')}
          >
            {theme === THEMES.LIGHT
              ? renderSvgIcon(NightModeIcon, {
                  alt: 'night mode',
                  'data-testid': addTestId('App.button.theme.light-mode'),
                  style: { marginTop: '5px', marginLeft: '5px' },
                })
              : renderSvgIcon(LightModeIcon, {
                  alt: 'light mode',
                  'data-testid': addTestId('App.button.theme.dark-mode'),
                  style: { marginTop: '6px', marginLeft: '4px' },
                })}
          </div>
        </div>
        <Navbar />
        <div className="main-container">
          <Routes />
        </div>
      </div>
    );
  }
}

App.propTypes = {
  store: PropTypes.objectOf(PropTypes.any).isRequired,
  onKeyPress: PropTypes.func,
};

App.defaultProps = {
  onKeyPress: () => {},
};

const mapDispatchToProps = (dispatch, ownProps) =>
  bindActionCreators(
    {
      _setTheme: ({ ...data }) => (_, getState) => {
        dispatch(setTheme({ ...data }));
      },

      _reset: ({ ...data }) => (_, getState) => {
        dispatch(reset({ ...data }));
      },

      _updateTaskStatus: ({ ...data }) => (_, getState) => {
        dispatch(updateTaskStatus({ ...data }));
      },

      _stopAllTasks: ({ ...data }) => (_, getState) => {
        dispatch(stopAllTasks({ ...data }));
      },

      _fetchSites: ({ ...data }) => (_, getState) => {
        dispatch(fetchSites({ ...data }, getState));
      },
    },
    dispatch
  );

const mapStateToProps = (state, props) => {
  return {
    tasks: makeTasks(state),
    theme: makeTheme(state),
  };
};

export default withReducer('App', reducers)(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
