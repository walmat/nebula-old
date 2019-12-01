import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import NumberFormat from 'react-number-format';
import PropTypes from 'prop-types';
import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../store/actions';
import { addTestId } from '../../utils';

export class PaymentFieldsPrimitive extends PureComponent {
  createOnChangeHandler(field) {
    const { onChange } = this.props;
    if (field === PAYMENT_FIELDS.CARD) {
      return event => {
        onChange({ field, value: event.target.value.replace(/\s/g, '') });
      };
    }
    return event => {
      onChange({ field, value: event.target.value });
    };
  }

  render() {
    const { value } = this.props;
    return (
      <div className="col col--gutter col--start col--expand">
        <div className="row row--start">
          <p className="row row--start row--expand body-text section-header profiles-payment__section-header">
            Payment
          </p>
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
                    data-testid={addTestId(`PaymentFieldsPrimitive.email`)}
                    data-private
                  />
                </div>
                <div className="col col--start col--expand col--no-gutter-left">
                  <NumberFormat
                    format="#### #### #### #### ##"
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="row row--start row--expand profiles-payment__input-group--card-number"
                    onChange={this.createOnChangeHandler(PAYMENT_FIELDS.CARD)}
                    value={value.card}
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
  onChange: PropTypes.func.isRequired,
  value: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
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
