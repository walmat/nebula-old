import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import validationStatus from '../utils/validationStatus';
import defns from '../utils/definitions/profileDefinitions';
import { RATES_FIELDS, profileActions, mapRateFieldToKey } from '../state/actions';

import './profiles.css';
import { PROFILE_FIELDS } from '../state/actions/profiles/profileActions';

export class ShippingRatesPrimitive extends Component {
  constructor(props) {
    super(props);
    this.selects = {
      [RATES_FIELDS.SITE]: {
        placeholder: 'Choose Site',
        type: 'site',
        className: 'col col--no-gutter-left',
      },
      [RATES_FIELDS.NAME]: {
        placeholder: 'Choose Rate',
        type: 'name',
        className: 'col col--no-gutter',
      },
    };
  }

  createOnChangeHandler(field) {
    const { onChange } = this.props;
    switch (field) {
      case RATES_FIELDS.SITE: {
        return event => {
          onChange({ field, value: event }, PROFILE_FIELDS.EDIT_SELECTED_SITE);
        };
      }
      default: {
        return event => {
          onChange({ field, value: event }, PROFILE_FIELDS.EDIT_RATES);
        };
      }
    }
  }

  renderSelect(field, value, options) {
    const { theme } = this.props;
    const { placeholder, type, className } = this.selects[field];
    return (
      <div className={className}>
        <Select
          required
          placeholder={placeholder}
          components={{ DropdownIndicator }}
          isMulti={false}
          isClearable={false}
          className={`profiles-rates__input-group--${type}`}
          classNamePrefix="select"
          styles={colourStyles(theme)}
          onChange={this.createOnChangeHandler(field)}
          value={value}
          options={options}
        />
      </div>
    );
  }

  renderRateFields() {
    const { value, errors } = this.props;
    const siteOptions = value.rates.map(r => ({ value: r.site.url, label: r.site.name }));
    let nameOptions = [];
    if (value.selectedSite) {
      const rates = value.rates.find(v => v.site.url === value.selectedSite.value);
      nameOptions = rates.rates.map(r => ({ value: r.rate, label: r.name }));
    }
    return (
      <div className="col profiles-rates__input-group">
        <div className="row row--gutter row--start">
          {this.renderSelect(RATES_FIELDS.SITE, value.selectedSite, siteOptions)}
          {this.renderSelect(RATES_FIELDS.NAME, value.selectedRate, nameOptions)}
        </div>
        <div className="row row--gutter">
          <input
            className="profiles-rates__input-group--rate"
            required
            disabled
            value={value.selectedRate}
            style={validationStatus(errors[mapRateFieldToKey[RATES_FIELDS.RATE]])}
            placeholder=""
          />
        </div>
      </div>
    );
  }

  render() {
    const { value } = this.props;
    return (
      <div className="col col--expand">
        <div className="row row--start">
          <p className="body-text section-header profiles-rates__section-header">Shipping Rates</p>
        </div>
        <div className="row row--start row--expand">
          <div className="profiles-rates col col--start col--no-gutter">
            <div className="row row--start row--no-gutter-left row--gutter-right">
              {value.rates.length ? (
                this.renderRateFields()
              ) : (
                <div className="col profiles-rates__input-group">
                  <div>
                    <p>No shipping rates found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ShippingRatesPrimitive.propTypes = {
  errors: defns.paymentStateErrors.isRequired,
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: defns.profile.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  errors: ownProps.profileToEdit.payment.errors,
  theme: state.theme,
  value: ownProps.profileToEdit,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes, section) => {
    dispatch(profileActions.edit(ownProps.profileToEdit.id, section, changes.value, changes.field));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingRatesPrimitive);
