import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  DropdownIndicator,
  IndicatorSeparator,
  colourStyles,
} from '../../styles/components/select';
import addTestId from '../../utils/addTestId';
import validationStatus from '../../utils/validationStatus';
import defns from '../../store/definitions/profileDefinitions';
import { RATES_FIELDS, profileActions, PROFILE_FIELDS } from '../../store/actions';

export class ShippingRatesPrimitive extends PureComponent {
  static renderButton(type, onClick, label) {
    return (
      <button
        type="button"
        className={`profiles-rates__input-group--${type}`}
        onClick={onClick}
        data-testid={addTestId(`ShippingRates.button.${type}`)}
      >
        {label}
      </button>
    );
  }

  constructor(props) {
    super(props);
    this.selects = {
      [RATES_FIELDS.SITE]: {
        placeholder: 'Choose Site',
        type: 'site',
        className: 'col col--start col--expand col--no-gutter',
      },
      [RATES_FIELDS.RATE]: {
        placeholder: 'Choose Rate',
        type: 'name',
        className: 'col col--start col--expand',
      },
    };

    this.deleteShippingRate = this.deleteShippingRate.bind(this);
  }

  deleteShippingRate() {
    const { onDeleteShippingRate, value } = this.props;
    let siteObject = [];
    if (value.selectedSite) {
      siteObject = value.rates.find(v => v.site.url === value.selectedSite.value);
      if (siteObject && siteObject.selectedRate) {
        onDeleteShippingRate(value.selectedSite, siteObject.selectedRate);
      }
    }
  }

  createOnChangeHandler(field) {
    const { onChange, value } = this.props;
    switch (field) {
      case RATES_FIELDS.SITE: {
        return event => {
          onChange({ field, value: event }, PROFILE_FIELDS.EDIT_SELECTED_SITE);
        };
      }
      default: {
        return event => {
          const rate = { name: event.label, price: event.price, rate: event.value };
          onChange({ field, value: { site: value.selectedSite, rate } }, PROFILE_FIELDS.EDIT_RATES);
        };
      }
    }
  }

  renderSelect(field, value, options) {
    const { theme } = this.props;
    const { placeholder, type, className } = this.selects[field];
    return (
      <Select
        required
        placeholder={placeholder}
        components={{ DropdownIndicator, IndicatorSeparator }}
        isMulti={false}
        isClearable={false}
        className={`${className} profiles-rates__input-group--${type}`}
        classNamePrefix="select"
        styles={colourStyles(theme)}
        onChange={this.createOnChangeHandler(field)}
        value={value}
        options={options}
        data-testid={addTestId(`ShippingRates.input.${type}`)}
        data-private
      />
    );
  }

  renderRateFields() {
    const { value } = this.props;
    const siteOptions = value.rates.map(({ site: { url, name } }) => ({ value: url, label: name }));
    let nameOptions = [];
    let siteObject = [];
    let rateValue = null;
    if (value.selectedSite) {
      siteObject = value.rates.find(v => v.site.url === value.selectedSite.value);
      if (siteObject) {
        if (siteObject.selectedRate) {
          const {
            selectedRate: { name, price, rate },
          } = siteObject;
          rateValue = { label: name, price, value: rate };
        }
        nameOptions = siteObject.rates.map(({ rate, price, name }) => ({
          value: rate,
          price,
          label: name,
        }));
      }
    } else {
      // reset selectedRate if there's no selected site
      siteObject.selectedRate = null;
    }
    return (
      <div className="col col--start col--expand profiles-rates__input-group">
        <div className="row row--start row--expand row--gutter">
          {this.renderSelect(RATES_FIELDS.SITE, value.selectedSite, siteOptions)}
          {this.renderSelect(RATES_FIELDS.RATE, rateValue, nameOptions)}
        </div>
        <div className="row row--start row--expand row--gutter">
          <input
            className="col col--start col--expand col--no-gutter-left profiles-rates__input-group--rate"
            required
            disabled
            value={rateValue ? rateValue.value : ''}
            style={validationStatus(false)}
            placeholder=""
            data-testid={addTestId('ShippingRates.input.rate')}
            data-private
          />
          <input
            className="col col--start col--expand col--no-gutter-left profiles-rates__input-group--price"
            required
            disabled
            value={rateValue ? rateValue.price : ''}
            style={validationStatus(false)}
            placeholder=""
            data-testid={addTestId('ShippingRates.input.price')}
            data-private
          />
        </div>
        <div className="row row--gutter row--end">
          <div className="col col--end col--no-gutter-left">
            {ShippingRatesPrimitive.renderButton('delete', this.deleteShippingRate, 'Delete')}
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="col col--expand">
        <div className="row row--start">
          <p className="row row--start row--expand body-text section-header profiles-rates__section-header">
            Shipping Rates
          </p>
        </div>
        <div className="row row--start row--expand">
          <div className="profiles-rates col col--start col--expand col--no-gutter">
            <div className="row row--start row--expand row--no-gutter">
              {this.renderRateFields()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ShippingRatesPrimitive.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onDeleteShippingRate: PropTypes.func.isRequired,
  value: defns.profile.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  theme: state.theme,
  value: ownProps.profileToEdit,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes, section) => {
    dispatch(profileActions.edit(ownProps.profileToEdit.id, section, changes.value, changes.field));
  },
  onDeleteShippingRate: (site, rate) => {
    dispatch(profileActions.deleteRate(site, rate));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingRatesPrimitive);
