import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../../../store/actions';
import { buildStyle } from '../../../styles';

const PhoneField = ({ id, value, disabled, onChange }) => (
  <div className="col col--no-gutter">
    <input
      className={`${id}-profiles-location__input-group--phone`}
      required
      placeholder="Phone"
      onChange={e => onChange({ field: LOCATION_FIELDS.PHONE, value: e.target.value })}
      value={value.phone}
      style={buildStyle(disabled, null)}
      disabled={disabled}
      data-private
    />
  </div>
);

PhoneField.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export const mapStateToProps = (state, ownProps) => {
  console.log(ownProps);
  return {
    id: ownProps.id,
    field: ownProps.field,
    value: ownProps.profile[mapProfileFieldToKey[ownProps.field]],
    disabled: ownProps.disabled,
  };
};

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(ownProps.profile.id, ownProps.field, changes.value, changes.field),
    );
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PhoneField);
