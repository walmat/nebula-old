import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../../../store/actions';
import { buildStyle } from '../../../styles';

const NameFields = ({ id, value, disabled, onChange }) => (
  <div className="row row--start row--expand row--gutter">
    <input
      className={`row row--start row--expand ${id}-profiles-location__input-group--first-name`}
      required
      placeholder="First Name"
      onChange={e => onChange({ field: LOCATION_FIELDS.FIRST_NAME, value: e.target.value })}
      value={value.firstName}
      style={buildStyle(disabled, null)}
      disabled={disabled}
      data-private
    />
    <input
      className={`row row--start row--expand ${id}-profiles-location__input-group--last-name`}
      required
      placeholder="Last Name"
      onChange={e => onChange({ field: LOCATION_FIELDS.LAST_NAME, value: e.target.value })}
      value={value.lastName}
      style={buildStyle(disabled, null)}
      disabled={disabled}
      data-private
    />
  </div>
);

NameFields.propTypes = {
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

export default connect(mapStateToProps, mapDispatchToProps)(NameFields);
