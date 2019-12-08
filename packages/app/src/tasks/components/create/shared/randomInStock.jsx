import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { renderSvgIcon } from '../../../../utils';
import { ReactComponent as NotRestocks } from '../../../../styles/images/tasks/restocks-off.svg';
import { ReactComponent as Restocks } from '../../../../styles/images/tasks/restocks.svg';

const RandomInStockToggle = ({ randomInStock, onToggle }) => (
  <div
    className="col col--expand col--end col--no-gutter tasks--create__input-group--filter"
    style={{ flexGrow: 1 }}
  >
    <div
      className="col col--end col--gutter"
      onClick={() => onToggle()}
      role="button"
      tabIndex={0}
      onKeyPress={() => {}}
    >
      {randomInStock
        ? renderSvgIcon(Restocks, {
            alt: '',
            title: 'Restock Mode',
          })
        : renderSvgIcon(NotRestocks, {
            alt: '',
            title: 'Not Restock Mode',
          })}
    </div>
  </div>
);

RandomInStockToggle.propTypes = {
  onToggle: PropTypes.func.isRequired,
  randomInStock: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  randomInStock: makeCurrentTask(state).product.randomInStock,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: () => {
    dispatch(taskActions.edit(null, TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RandomInStockToggle);
