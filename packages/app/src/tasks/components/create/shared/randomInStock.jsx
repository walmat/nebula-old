import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { renderSvgIcon } from '../../../../utils';
import { ReactComponent as NotRandomInStock } from '../../../../styles/images/tasks/random-off.svg';
import { ReactComponent as RandomInStock } from '../../../../styles/images/tasks/random.svg';

const RandomInStockToggle = ({ randomInStock, onToggle }) => (
  <div className="col col--expand col--no-gutter" style={{ flexGrow: 1 }}>
    <div
      className="col col--gutter"
      style={{ marginBottom: 15 }}
      onClick={() => onToggle()}
      role="button"
      tabIndex={0}
      onKeyPress={() => {}}
    >
      {randomInStock
        ? renderSvgIcon(RandomInStock, {
            alt: '',
            title: 'Random In Stock',
          })
        : renderSvgIcon(NotRandomInStock, {
            alt: '',
            title: 'Not Random In Stock',
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
