import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../../../store/actions';
import { buildStyle } from '../../../styles';

const AddressFields = ({ id, value, disabled, onChange }) => (
  <>
    <div className="row row--start row--expand row--gutter">
      <input
        className={`row row--start row--expand ${id}-profiles-location__input-group--address-one`}
        required
        placeholder="Address Line 1"
        onChange={e => onChange({ field: LOCATION_FIELDS.ADDRESS, value: e.target.value })}
        value={value.address}
        style={buildStyle(disabled, null)}
        disabled={disabled}
        data-private
      />
    </div>
    <div className="row row--start row--expand row--gutter">
      <input
        className={`row row--start row--expand ${id}-profiles-location__input-group--address-two`}
        placeholder="Address Line 2"
        onChange={e => onChange({ field: LOCATION_FIELDS.APT, value: e.target.value })}
        value={value.apt}
        style={buildStyle(disabled, null)}
        disabled={disabled}
        data-private
      />
    </div>
  </>
);

AddressFields.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  field: ownProps.field,
  value: ownProps.profile[mapProfileFieldToKey[ownProps.field]],
  disabled: ownProps.disabled,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(ownProps.profile.id, ownProps.field, changes.value, changes.field),
    );
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(AddressFields);
