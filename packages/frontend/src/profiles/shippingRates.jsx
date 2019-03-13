import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { buildStyle } from '../utils/styles';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import validationStatus from '../utils/validationStatus';
import defns from '../utils/definitions/profileDefinitions';
import { RATES_FIELDS, profileActions, mapRateFieldToKey } from '../state/actions';
import { addTestId } from '../utils';

import './profiles.css';

export class ShippingRatesPrimitive extends Component {
  constructor(props) {
    super(props);
    this.selects = {
      [RATES_FIELDS.SITE]: {
        placeholder: 'Choose Site',
        className: '',
        colStyling: '',
      },
      [RATES_FIELDS.NAME]: {
        placeholder: 'Choose Rate',
        className: '',
        colStyling: '',
      },
    };
  }

  createOnChangeHandler(field) {
    const { onChange } = this.props;
    return event => {
      onChange({ field, value: event.target.value });
    };
  }

  renderSelect(field, value, options) {
    const { errors, theme } = this.props;
    const { placeholder, className, colStyling } = this.selects[field];
    return (
      <div className={colStyling}>
        <Select
          required
          placeholder={placeholder}
          components={{ DropdownIndicator }}
          isMulti={false}
          isClearable={false}
          className={`profiles-rates__input-group--${className}`}
          classNamePrefix="select"
          styles={colourStyles(theme, buildStyle(false, errors[mapRateFieldToKey[field]]))}
          onChange={this.createOnChangeHandler(field)}
          value={value}
          options={options}
        />
      </div>
    );
  }

  renderRateFields() {
    const { value, errors, profile } = this.props;
    const siteOptions = value.map(r => ({ value: r.site.url, label: r.site.name }));
    let nameOptions = [];
    if (profile.selectedSite) {
      const rates = value.find(v => v.site.url === profile.selectedSite.url);
      console.log(rates);
      nameOptions = rates.map(r => ({ value: r.rates.rate, label: r.rates.name }));
    }
    return (
      <div className="col profiles-rates__input-group">
        <div className="row row--gutter">
          {this.renderSelect(RATES_FIELDS.SITE, profile.selectedSite, siteOptions)}
          {this.renderSelect(RATES_FIELDS.NAME, profile.selectedRate, nameOptions)}
        </div>
        <div className="row row--gutter">
          <input
            className="profiles-rates--rate"
            required
            disabled
            value={value.rate}
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
      <div className="col">
        <div className="row row--start">
          <p className="body-text section-header profiles-rates__section-header">Shipping Rates</p>
        </div>
        <div className="row row--start row--expand">
          <div className="profiles-rates col col--start col--no-gutter">
            <div className="row row--start row--no-gutter-left row--gutter-right">
              {value.length ? (
                this.renderRateFields()
              ) : (
                <div className="col profiles-rates__input-group">
                  <div>No shipping rates</div>
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
  profile: defns.profile.isRequired,
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: defns.rates.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  errors: ownProps.profileToEdit.payment.errors,
  profile: ownProps.profileToEdit,
  theme: state.theme,
  value: ownProps.profileToEdit.rates,
});

export const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingRatesPrimitive);
