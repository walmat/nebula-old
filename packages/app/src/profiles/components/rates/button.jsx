import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentProfile } from '../../state/selectors';
import { profileActions } from '../../../store/actions';

const onClick = (selectedStore, rates, onDelete) => {
  if (!selectedStore) {
    return null;
  }

  const storeObject = rates.find(v => v.store.url === selectedStore.value);
  if (!storeObject || (storeObject && !storeObject.selectedRate)) {
    return null;
  }

  const { selectedRate } = storeObject;

  return onDelete(selectedStore, selectedRate);
};

const DeleteButton = ({ selectedStore, rates, onDelete }) => (
  <div className="row row--gutter row--end">
    <div className="col col--end col--no-gutter-left">
      <button
        type="button"
        className="profiles-rates__input-group--delete"
        onClick={() => onClick(selectedStore, rates, onDelete)}
      >
        Delete
      </button>
    </div>
  </div>
);

DeleteButton.propTypes = {
  selectedStore: PropTypes.objectOf(PropTypes.any),
  onDelete: PropTypes.func.isRequired,
  rates: PropTypes.arrayOf(PropTypes.any).isRequired,
};

DeleteButton.defaultProps = {
  selectedStore: null,
};

const mapStateToProps = state => ({
  selectedStore: makeCurrentProfile(state).selectedStore,
  rates: makeCurrentProfile(state).rates,
});

const mapDispatchToProps = dispatch => ({
  onDelete: (store, rate) => {
    dispatch(profileActions.deleteRate(store, rate));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DeleteButton);
