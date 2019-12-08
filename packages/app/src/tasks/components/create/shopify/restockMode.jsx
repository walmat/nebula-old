import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { renderSvgIcon } from '../../../../utils';
import { ReactComponent as NotRestocks } from '../../../../styles/images/tasks/restocks-off.svg';
import { ReactComponent as Restocks } from '../../../../styles/images/tasks/restocks.svg';

const RestockMode = ({ restockMode, onToggle }) => (
  <div
    className="col col--end col--no-gutter-left"
    style={{ marginBottom: '4.5px' }}
    onClick={() => onToggle()}
    role="button"
    tabIndex={0}
    onKeyPress={() => {}}
  >
    {restockMode
      ? renderSvgIcon(Restocks, {
          alt: 'Restock Mode',
          title: 'Restock Mode',
        })
      : renderSvgIcon(NotRestocks, {
          alt: 'Restock Mode',
          title: 'Restock Mode',
        })}
  </div>
);

RestockMode.propTypes = {
  onToggle: PropTypes.func.isRequired,
  restockMode: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  restockMode: makeCurrentTask(state).restockMode,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: () => {
    dispatch(taskActions.edit(null, TASK_FIELDS.TOGGLE_RESTOCK_MODE));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RestockMode);
