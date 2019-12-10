import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';

import { makeLocation } from '../state/selectors';
import { navbarActions, NAVBAR_ACTIONS, mapActionsToRoutes } from '../../store/actions';

import { renderSvgIcon } from '../../utils';
import { navbarDefaults } from '../../constants';

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
        render={navbarDefaults[route]}
      />
    ),
  );

const mapStateToProps = state => ({
  location: makeLocation(state),
});

const mapDispatchToProps = dispatch => ({
  onRoute: (route, history) => dispatch(navbarActions.route(route, history)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withRouter(NavbarIconRows));
