import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeSites } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import { buildStyle } from '../../../../styles';

const ProductField = ({ product, sites, onChange }) => (
  <div className="col col--expand">
    <p className="tasks--create__label">Product</p>
    <input
      className="tasks--create__input tasks--create__input--bordered tasks--create__input--field"
      type="text"
      placeholder="Variant, Keywords, Link"
      onChange={e => onChange(e.target.value, sites)}
      value={product.raw}
      style={buildStyle(false, null)}
      required
    />
  </div>
);

ProductField.propTypes = {
  onChange: PropTypes.func.isRequired,
  sites: PropTypes.arrayOf(PropTypes.any).isRequired,
  product: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  sites: makeSites(state),
  product: makeCurrentTask(state).product,
});

const mapDispatchToProps = dispatch => ({
  onChange: (value, sites) => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_PRODUCT, value, sites));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProductField);
