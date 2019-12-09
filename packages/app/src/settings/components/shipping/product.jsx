import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeShipping } from '../../state/selectors';
import { makeShopifySites } from '../../../app/state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';

const ShippingProduct = ({ product, sites, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-right">
    <p className="settings--shipping-manager__input-group--label">Product / Shipping Rate</p>
    <input
      className="settings--shipping-manager__input-group--product"
      type="text"
      placeholder="Variant, Keywords, Link"
      onChange={e =>
        onChange({ field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT, value: e.target.value, sites })
      }
      value={product.raw}
      required
    />
  </div>
);

ShippingProduct.propTypes = {
  sites: PropTypes.arrayOf(PropTypes.any).isRequired,
  product: PropTypes.objectOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  sites: makeShopifySites(state),
  product: makeShipping(state).product,
});

const mapDispatchToProps = dispatch => ({
  onChange: changes => {
    dispatch(settingsActions.editShipping(changes.field, changes.value, changes.sites));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingProduct);
