import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { profileActions } from '../../../store/actions';

const onClick = ({ selectedSite, rates, onDelete }) => {
  if (!selectedSite) {
    return null;
  }

  const siteObject = rates.find(v => v.site.url === selectedSite.value);
  if (!siteObject || (siteObject && !siteObject.selectedRate)) {
    return null;
  }

  const { selectedRate } = siteObject;

  return onDelete(selectedSite, selectedRate);
};

const DeleteButton = ({ selectedSite, rates, onDelete }) => (
  <div className="row row--gutter row--end">
    <div className="col col--end col--no-gutter-left">
      <button
        type="button"
        className="profiles-rates__input-group--delete"
        onClick={() => onClick(selectedSite, rates, onDelete)}
      >
        Delete
      </button>
    </div>
  </div>
);

DeleteButton.propTypes = {
  selectedSite: PropTypes.objectOf(PropTypes.any).isRequired,
  onDelete: PropTypes.func.isRequired,
  rates: PropTypes.objectOf(PropTypes.any).isRequired,
};

export const mapStateToProps = state => ({
  selectedSite: state.CurrentProfile.rates.selectedSite,
  rates: state.CurrentProfile.rates,
});

export const mapDispatchToProps = dispatch => ({
  onDelete: (site, rate) => {
    dispatch(profileActions.deleteRate(site, rate));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DeleteButton);
