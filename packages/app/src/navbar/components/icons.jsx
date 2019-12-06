import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';

import { ReactComponent as TasksIcon } from '../../styles/images/navbar/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../../styles/images/navbar/profiles.svg';
import { ReactComponent as SettingsIcon } from '../../styles/images/navbar/settings.svg';

import { navbarActions, ROUTES, NAVBAR_ACTIONS, mapActionsToRoutes } from '../../store/actions';
import { renderSvgIcon } from '../../utils';

const classNameCalc = (...supportedRoutes) => route =>
  supportedRoutes.includes(route) ? 'active' : null;

const defaultProps = {
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
  [NAVBAR_ACTIONS.ROUTE_SETTINGS]: {
    Icon: SettingsIcon,
    iconName: 'settings',
    classNameGenerator: classNameCalc(ROUTES.SETTINGS),
  },
};

const NavbarIcon = ({ props: { Icon, iconName, className, onClick } }) => (
  <div key={iconName} className="row row--expand">
    <div className="col">
      <div className="row row--start row--gutter">
        <div className={`navbar__icon--${iconName}`}>
          <div
            role="button"
            tabIndex={0}
            title={iconName}
            onKeyPress={() => {}}
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

NavbarIcon.propTypes = {
  props: PropTypes.objectOf(PropTypes.any).isRequired,
};

const NavbarIconRow = ({
  route,
  location,
  history,
  onRoute,
  render: { Icon, iconName, classNameGenerator },
}) => (
  <NavbarIcon
    props={{
      Icon,
      iconName,
      className: classNameGenerator(location.pathname),
      onClick: () =>
        mapActionsToRoutes[route] === location.pathname ? {} : onRoute(route, history),
    }}
  />
);

NavbarIconRow.propTypes = {
  route: PropTypes.string.isRequired,
  history: PropTypes.objectOf(PropTypes.any).isRequired,
  location: PropTypes.objectOf(PropTypes.any).isRequired,
  render: PropTypes.objectOf(PropTypes.any).isRequired,
  onRoute: PropTypes.func.isRequired,
};

const NavbarIconRows = ({ location, history, onRoute }) =>
  [NAVBAR_ACTIONS.ROUTE_TASKS, NAVBAR_ACTIONS.ROUTE_PROFILES, NAVBAR_ACTIONS.ROUTE_SETTINGS].map(
    route => (
      <NavbarIconRow
        key={route}
        route={route}
        onRoute={onRoute}
        history={history}
        location={location}
        render={defaultProps[route]}
      />
    ),
  );

const mapStateToProps = state => ({
  location: state.Navbar.location,
});

const mapDispatchToProps = dispatch => ({
  onRoute: (route, history) => dispatch(navbarActions.route(route, history)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withRouter(NavbarIconRows));
