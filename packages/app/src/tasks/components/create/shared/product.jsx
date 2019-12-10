import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeStores, makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';

const ProductField = ({ theme, product, stores, onChange }) => (
  <div className="col col--start col--expand">
    <p className={`create-tasks__label--${theme}`}>Product</p>
    <input
      className={`create-tasks__input--${theme}`}
      type="text"
      placeholder="Variant, Keywords, Link"
      onChange={e => onChange(e.target.value, stores)}
      value={product.raw}
      style={buildStyle(false, null)}
      required
    />
  </div>
);

ProductField.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  stores: PropTypes.arrayOf(PropTypes.any).isRequired,
  product: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  theme: makeTheme(state),
  stores: makeStores(state),
  product: makeCurrentTask(state).product,
});

const mapDispatchToProps = dispatch => ({
  onChange: (value, stores) => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_PRODUCT, value, stores));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProductField);
