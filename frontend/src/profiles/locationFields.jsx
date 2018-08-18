import React, { Component } from 'react';
import Select, { components } from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import defns from '../utils/definitions/profileDefinitions';
import getAllCountries from '../getAllCountries';
import getAllStates from '../getAllStates';
import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../state/actions';
import './profiles.css';
import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';

// change this based on whether it's open or not {{toggle between DDU & DDD}}
const DropdownIndicator = (props) => {
  return components.DropdownIndicator && (
    <components.DropdownIndicator {...props}>
      <img src={props.menuIsOpen ? DDU : DDD} style={{ marginRight: '-5px', cursor: 'pointer' }} alt="" />
    </components.DropdownIndicator>
  );
};

const colourStyles = {
  control: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: '#f4f4f4',
      height: '29px',
      minHeight: '29px',
      border: '1px solid #F0405E',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
      boxShadow: 'none',
    };
  },
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isFocused ? '#f4f4f4' : isDisabled ? '#ccc' : isSelected ? '#ccc' : '#fff',
      maxHeight: '200px',
      color: '#161318',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: 'none',
    };
  },
  // fix this? doesn't work for some reason..
  DropdownIndicator: (styles, { menuIsOpen }) => {
    return {
      ...styles,
      marginRight: '-5px',
      src: menuIsOpen ? DDU : DDD,
    };
  },
};

const errorStyle = {
  borderColor: 'red',
};

class LocationFields extends Component {
  static buildCountryOptions() {
    return getAllCountries();
  }

  static buildStateOptions() {
    return getAllStates();
  }

  static buildStyle(disabled, errors) {
    return Object.assign(
      {},
      { backgroundColor: disabled ? '#e5e5e5' : '#F5F5F5' },
      validationStatus(errors),
    );
  }

  static setBorderColor(validationErrors) {
    return validationErrors ? errorStyle : {};
  }

  createOnChangeHandler(field) {
    return (event) => {
      this.props.onChange({
        field,
        value: event.value,
      });
    };
  }

  isStatesDisabled() {
    return this.props.value.country !== 'United States' || this.props.disabled;
  }

  render() {
    const { errors, disabled } = this.props;
    return (
      <div>
        <input id={`${this.props.id}-first-name`} required placeholder="First Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)} value={this.props.value.firstName} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])} disabled={disabled} />
        <input id={`${this.props.id}-last-name`} required placeholder="Last Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)} value={this.props.value.lastName} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])} disabled={disabled} />
        <input id={`${this.props.id}-address-one`} required placeholder="Address Line 1" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)} value={this.props.value.address} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])} disabled={disabled} />
        <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)} value={this.props.value.apt} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.APT])} disabled={disabled} />
        <input id={`${this.props.id}-city`} required placeholder="City" onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)} value={this.props.value.city} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.CITY])} disabled={disabled} />
        <Select
          required
          defaultValue="Choose State"
          components={{ DropdownIndicator }}
          id={`${this.props.id}-state`}
          styles={colourStyles}
          options={LocationFields.buildStateOptions()}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.STATE)}
          value={this.props.value.value}
          style={LocationFields.buildStyle(this.isStatesDisabled(), errors[LOCATION_FIELDS.STATE])} disabled={this.isStatesDisabled()}
        />
        <input id={`${this.props.id}-zip-code`} required placeholder="Zip Code" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)} value={this.props.value.zipCode} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])} disabled={disabled} />
        <Select
          required
          defaultValue="Choose Country"
          components={{ DropdownIndicator }}
          id={`${this.props.id}-country`}
          styles={colourStyles}
          options={LocationFields.buildCountryOptions()}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)}
          value={this.props.value.value}
          style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY])}
          disabled={disabled}
        />
        {/* <select id={`${this.props.id}-country`} required onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)} value={this.props.value.country} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY])} disabled={disabled}>
          {LocationFields.buildCountryOptions()}
        </select> */}
        <input id={`${this.props.id}-phone`} required placeholder="Phone" onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)} value={this.props.value.phone} style={LocationFields.buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER])} disabled={disabled} />
      </div>
    );
  }
}

LocationFields.propTypes = {
  errors: defns.locationStateErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  value: defns.locationState.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  disabled: ownProps.disabled,
  errors: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]].errors,
  value: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]],
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: (changes) => {
    dispatch(profileActions.edit(
      ownProps.profileToEdit.id,
      ownProps.fieldToEdit,
      changes.value,
      changes.field,
    ));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LocationFields);
