import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { renderSvgIcon } from '../../utils';

import { profileActions, PROFILE_FIELDS } from '../../store/actions';
import { makeCurrentProfile } from '../state/selectors';

import { ReactComponent as BillingMatchesShippingIcon } from '../../styles/images/profiles/matches.svg';
import { ReactComponent as CopyShippingInfoToBilling } from '../../styles/images/profiles/transfer.svg';
import { ReactComponent as BillingDoesNotMatchShippingIcon } from '../../styles/images/profiles/not-matches.svg';

const ShippingActions = ({
  onClickBillingMatchesShipping,
  onClickTransferShippingInformation,
  onKeyPress,
  currentProfile,
}) => (
  <div className="row row--start row--expand row--gutter">
    <div className="col col--gutter">
      <div
        role="button"
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClickBillingMatchesShipping}
      >
        {currentProfile.matches
          ? renderSvgIcon(BillingMatchesShippingIcon, {
              title: 'Billing Matches Shipping',
              alt: 'Billing Matches Shipping',
              className: 'profiles__fields--matches',
            })
          : renderSvgIcon(BillingDoesNotMatchShippingIcon, {
              title: "Billing Doesn't Match Shipping",
              alt: "Billing Doesn't Match Shipping",
              className: 'profiles__fields--matches',
            })}
      </div>
    </div>
    <div className="col col--gutter">
      <div
        role="button"
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClickTransferShippingInformation}
      >
        {renderSvgIcon(CopyShippingInfoToBilling, {
          title: 'Transfer Shipping Information',
          alt: '',
          className: 'profiles__fields--transfer',
        })}
      </div>
    </div>
  </div>
);

ShippingActions.propTypes = {
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  onClickBillingMatchesShipping: PropTypes.func.isRequired,
  onClickTransferShippingInformation: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

ShippingActions.defaultProps = {
  onKeyPress: () => {},
};

const mapStateToProps = state => ({
  currentProfile: makeCurrentProfile(state),
});

const mapDispatchToProps = dispatch => ({
  onClickTransferShippingInformation: () => {
    dispatch(profileActions.transfer());
  },
  onClickBillingMatchesShipping: () => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.TOGGLE_MATCHES, ''));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingActions);
