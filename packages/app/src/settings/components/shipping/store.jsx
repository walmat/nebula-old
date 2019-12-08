import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import CreatableSelect from 'react-select/creatable';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../styles/components/select';

import { makeTheme, makeShopifySites } from '../../../app/state/selectors';
import { makeProfiles } from '../../../profiles/state/selectors';
import { settingsActions, SETTINGS_FIELDS } from '../../../store/actions';
import { createStore } from '../../../constants/tasks';
import { buildStyle } from '../../../styles';

const handleCreateStore = (event, field, onChange) => {
  const newStore = createStore(event);

  if (!newStore) {
    return null;
  }
  return onChange({ field, value: newStore });
};

const StoreSelect = ({ placeholder, type, theme, store, sites, onChange }) => {
  let shippingSiteValue = null;
  if (store && store.name) {
    shippingSiteValue = {
      value: store.url,
      label: store.name,
    };
  }
  return (
    <div className="col col--start col--expand col--gutter">
      <p className="settings--shipping-manager__input-group--label">Store</p>
      <CreatableSelect
        isClearable={false}
        isOptionDisabled={option => !option.supported && option.supported !== undefined}
        required
        placeholder={placeholder}
        components={{ DropdownIndicator, IndicatorSeparator, Control, Option, Menu, MenuList }}
        isMulti={false}
        className={`settings--shipping-manager__input-group--${type}`}
        classNamePrefix="select"
        styles={colourStyles(theme, buildStyle(false, null))}
        onChange={event =>
          onChange({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_STORE,
            value: { name: event.label, url: event.value, apiKey: event.apiKey },
          })
        }
        onCreateOption={e => handleCreateStore(e, SETTINGS_FIELDS.EDIT_SHIPPING_STORE, onChange)}
        value={shippingSiteValue}
        options={sites}
      />
    </div>
  );
};

StoreSelect.propTypes = {
  placeholder: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  store: PropTypes.objectOf(PropTypes.any),
  sites: PropTypes.arrayOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
};

StoreSelect.defaultProps = {
  store: null,
};

export const mapStateToProps = state => ({
  store: state.Shipping.store,
  profiles: makeProfiles(state),
  sites: makeShopifySites(state),
  theme: makeTheme(state),
});

export const mapDispatchToProps = dispatch => ({
  onChange: changes => {
    dispatch(settingsActions.editShipping(changes.field, changes.value, changes.sites));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(StoreSelect);
