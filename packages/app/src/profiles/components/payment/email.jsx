import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../../store/actions';

const EmailField = ({ value, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-left">
    <input
      required
      className="row row--start row--expand profiles-payment__input-group--email"
      placeholder="Email Address"
      onChange={e => onChange({ field: PAYMENT_FIELDS.EMAIL, value: e.target.value })}
      value={value.email}
      data-private
    />
  </div>
);

EmailField.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  value: ownProps.profile.payment,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(EmailField);
