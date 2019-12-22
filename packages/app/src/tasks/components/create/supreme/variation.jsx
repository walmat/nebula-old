/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';
import { makeTheme } from '../../../../app/state/selectors';

const VariationField = ({ theme, variation, onChange }) => (
  <div className="col col--start col--expand">
    <p className={`create-tasks__label--${theme}`}>Variation</p>
    <input
      className={`create-tasks__input--${theme} create-tasks__short`}
      type="text"
      placeholder="Color/Style"
      onChange={e => onChange(e.target.value)}
      value={variation}
      style={buildStyle(false, null)}
      required
    />
  </div>
);

VariationField.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  variation: PropTypes.string.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  variation: makeCurrentTask(state).product.variation,
});

export const mapDispatchToProps = dispatch => ({
  onChange: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_PRODUCT_VARIATION, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(VariationField);
