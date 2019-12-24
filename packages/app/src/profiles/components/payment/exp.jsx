import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';

import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../../store/actions';

const ExpirationField = ({ value, onChange }) => (
  <NumberFormat
    format="##/##"
    className="col col--start col--expand profiles-payment__input-group--expiration"
    placeholder="MM/YY"
    onChange={e => onChange({ field: PAYMENT_FIELDS.EXP, value: e.target.value })}
    value={value.exp}
    mask={['M', 'M', 'Y', 'Y']}
    data-private
  />
);

ExpirationField.propTypes = {
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

export default connect(mapStateToProps, mapDispatchToProps)(ExpirationField);
