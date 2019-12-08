/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';

const VariationField = ({ variation, onChange }) => (
  <div className="col col--end col--no-gutter-right">
    <p className="tasks--create__label">Variation</p>
    <input
      className="tasks--create__input tasks--create__input--bordered tasks--create__input--variation"
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
  onChange: PropTypes.func.isRequired,
  variation: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
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
