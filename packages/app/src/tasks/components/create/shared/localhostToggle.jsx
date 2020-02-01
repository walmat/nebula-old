import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import { renderSvgIcon } from '../../../../utils';
import { ReactComponent as NotRandomInStock } from '../../../../styles/images/tasks/random-off.svg';
import { ReactComponent as RandomInStock } from '../../../../styles/images/tasks/random.svg';

const LocalhostToggle = ({ theme, useLocalhost, onToggle }) => (
  <div className="row row--expand row--no-gutter" style={{ flexGrow: 0 }}>
    <div
      className="col col--gutter"
      style={{ marginBottom: 15, flexGrow: 0 }}
      onClick={() => onToggle()}
      role="button"
      tabIndex={0}
      onKeyPress={() => {}}
    >
      {useLocalhost
        ? renderSvgIcon(RandomInStock, {
            alt: '',
            title: 'Localhost',
          })
        : renderSvgIcon(NotRandomInStock, {
            alt: '',
            title: 'Random proxy',
          })}
    </div>
    <div
      className={`col col--no-gutter create-tasks__text--${theme}`}
      style={{ marginBottom: 15, flexGrow: 0 }}
      role="button"
      tabIndex={0}
      onKeyPress={() => {}}
    >
      Use Localhost?
    </div>
  </div>
);

LocalhostToggle.propTypes = {
  theme: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  useLocalhost: PropTypes.bool.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  useLocalhost: makeCurrentTask(state).useLocalhost,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: () => {
    dispatch(taskActions.edit(null, TASK_FIELDS.TOGGLE_LOCALHOST));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(LocalhostToggle);
