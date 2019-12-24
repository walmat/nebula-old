import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import NameFields from './name';
import AddressFields from './address';
import CityStateFields from './cityState';
import ZipCountryFields from './zipCountry';
import PhoneField from './phone';
import ShippingActions from './actions';

import { PROFILE_FIELDS } from '../../../store/actions';
import { makeCurrentProfile } from '../../state/selectors';

const LocationFieldsPrimitive = ({ id, header, className, profile, field, disabled }) => (
  <div className={className}>
    <div className="row row--gutter row--start">
      <p className="row row--start row--expand body-text section-header profiles-location__section-header">
        {header}
      </p>
    </div>
    <div className="row row--start row--no-gutter">
      <div className="col col--no-gutter col--start col--expand profiles-shipping-container">
        <div className="profiles-location col col--start col--expand col--no-gutter">
          <div className="row row--start row--expand row--no-gutter">
            <div className="col col--start col--expand profiles-location__input-group">
              <NameFields id={id} profile={profile} field={field} disabled={disabled} />
              <AddressFields id={id} profile={profile} field={field} disabled={disabled} />
              <CityStateFields id={id} profile={profile} field={field} disabled={disabled} />
              <ZipCountryFields id={id} profile={profile} field={field} disabled={disabled} />
              <div className="row row--start row--gutter">
                <PhoneField id={id} profile={profile} field={field} disabled={disabled} />
                <div className="col col--gutter col--expand">
                  {id === 'shipping' ? <ShippingActions /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

LocationFieldsPrimitive.propTypes = {
  id: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  header: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  className: PropTypes.string.isRequired,
  profile: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  field: !makeCurrentProfile(state).matches ? ownProps.field : PROFILE_FIELDS.EDIT_SHIPPING,
  header: ownProps.header,
  disabled: ownProps.id === 'billing' ? makeCurrentProfile(state).matches : false,
  className: ownProps.className,
  profile: makeCurrentProfile(state),
});

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(LocationFieldsPrimitive);
