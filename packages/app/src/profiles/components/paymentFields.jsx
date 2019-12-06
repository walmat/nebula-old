import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import EmailField from './payment/email';
import CardField from './payment/card';
import ExpirationField from './payment/exp';
import CvvField from './payment/cvv';

const PaymentFieldsPrimitive = ({ profile }) => (
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
            <EmailField profile={profile} />
            <CardField profile={profile} />
            <div className="row row--start row--expand row--gutter">
              <ExpirationField profile={profile} />
              <CvvField profile={profile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

PaymentFieldsPrimitive.propTypes = {
  profile: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  profile: ownProps.profile,
});

export const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentFieldsPrimitive);
