import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';

import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../../store/actions';

const CardField = ({ value, onChange }) => (
  <div className="col col--start col--expand col--no-gutter-left">
    <NumberFormat
      format="#### #### #### #### ##"
      placeholder="XXXX XXXX XXXX XXXX"
      className="row row--start row--expand profiles-payment__input-group--card-number"
      onChange={e =>
        onChange({ field: PAYMENT_FIELDS.CARD, value: e.target.value.replace(/\s/g, '') })
      }
      value={value.card}
      data-private
    />
  </div>
);

CardField.propTypes = {
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
)(CardField);
