import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../../store/actions';

const CvvField = ({ value, onChange }) => (
  <input
    required
    className="col col--start col--expand profiles-payment__input-group--cvv"
    placeholder="CVV"
    maxLength={4}
    onChange={e => onChange({ field: PAYMENT_FIELDS.CVV, value: e.target.value })}
    value={value.cvv}
    data-private
  />
);

CvvField.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  value: ownProps.profile.payment,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(
        ownProps.profile.id,
        PROFILE_FIELDS.EDIT_PAYMENT,
        changes.value,
        changes.field,
      ),
    );
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CvvField);
