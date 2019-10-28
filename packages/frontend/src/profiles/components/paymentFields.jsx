import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import NumberFormat from 'react-number-format';
import PropTypes from 'prop-types';
import validationStatus from '../../utils/validationStatus';
import defns from '../../state/definitions/profileDefinitions';
import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../state/actions';
import { addTestId } from '../../utils';

export class PaymentFieldsPrimitive extends PureComponent {
  createOnChangeHandler(field) {
    const { onChange } = this.props;
    if (field === PAYMENT_FIELDS.CARD_NUMBER) {
      return event => {
        onChange({ field, value: event.target.value.replace(/\s/g, '') });
      };
    }
    return event => {
      onChange({ field, value: event.target.value });
    };
  }

  render() {
    const { errors, value } = this.props;
    return (
      <div className="col col--gutter col--start col--expand">
        <div className="row row--start">
          <p className="row row--start row--expand body-text section-header profiles-payment__section-header">Payment</p>
        </div>
        <div className="row row--start row--expand">
          <div className="profiles-payment col col--start col--expand col--no-gutter">
            <div className="row row--start row--expand row--no-gutter">
              <div className="col col--start col--expand profiles-payment__input-group">
                <div className="col col--start col--expand col--no-gutter-left">
                  <input
                    required
                    className="row row--start row--expand profiles-payment__input-group--email"
                    placeholder="Email Address"
                    onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EMAIL)}
                    value={value.email}
                    style={validationStatus(errors[PAYMENT_FIELDS.EMAIL])}
                    data-testid={addTestId(`PaymentFieldsPrimitive.email`)}
                    data-private
                  />
                </div>
                <div className="col col--start col--expand col--no-gutter-left">
                  <NumberFormat
                    format="#### #### #### #### ##"
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="row row--start row--expand profiles-payment__input-group--card-number"
                    onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CARD_NUMBER)}
                    value={value.cardNumber}
                    style={validationStatus(errors[PAYMENT_FIELDS.CARD_NUMBER])}
                    data-testid={addTestId(`PaymentFieldsPrimitive.card-number`)}
                    data-private
                  />
                </div>
                <div className="row row--start row--expand row--gutter">
                  <NumberFormat
                    format="##/##"
                    className="col col--start col--expand profiles-payment__input-group--expiration"
                    placeholder="MM/YY"
                    onChange={this.createOnChangeHandler(PAYMENT_FIELDS.EXP)}
                    value={value.exp}
                    style={validationStatus(errors[PAYMENT_FIELDS.EXP])}
                    mask={['M', 'M', 'Y', 'Y']}
                    data-testid={addTestId(`PaymentFieldsPrimitive.expiration`)}
                    data-private
                  />
                  <input
                    required
                    className="col col--start col--expand profiles-payment__input-group--cvv"
                    placeholder="CVV"
                    onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CVV)}
                    value={value.cvv}
                    style={validationStatus(errors[PAYMENT_FIELDS.CVV])}
                    data-testid={addTestId(`PaymentFieldsPrimitive.cvv`)}
                    data-private
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

PaymentFieldsPrimitive.propTypes = {
  errors: defns.paymentStateErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  value: defns.paymentState.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  errors: ownProps.profileToEdit.payment.errors,
  value: ownProps.profileToEdit.payment,
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(
        ownProps.profileToEdit.id,
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
)(PaymentFieldsPrimitive);
