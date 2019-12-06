import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { profileActions, PROFILE_FIELDS } from '../../../store/actions';

const saveProfile = (currentProfile, onCreate, onUpdate) => {
  // todo: simplify this!
  if (currentProfile.id) {
    return onUpdate(currentProfile);
  }
  // No id tag exists, add this as a new profile.
  return onCreate(currentProfile);
};

const SaveProfileFields = ({ currentProfile, onNameChange, onCreate, onUpdate }) => (
  <div
    className="row row--expand row--end row--gutter profiles--save-row"
    style={{ width: '100%' }}
  >
    <div className="col col--end col--no-gutter-left">
      <div className="row row--extend row--end row--gutter">
        <input
          className="profiles__fields--name"
          required
          onChange={onNameChange}
          value={currentProfile.name}
          placeholder="Profile Name"
          data-private
        />
      </div>
    </div>
    <div className="col col--end col--gutter">
      <div className="row row--extend row--end row--no-gutter">
        <button
          type="button"
          className="profiles__fields--save"
          onClick={() => saveProfile(currentProfile, onCreate, onUpdate)}
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

SaveProfileFields.propTypes = {
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  onNameChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  currentProfile: state.CurrentProfile,
});

export const mapDispatchToProps = dispatch => ({
  onNameChange: event => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.EDIT_NAME, event.target.value));
  },
  onCreate: newProfile => {
    dispatch(profileActions.create(newProfile));
  },
  onUpdate: profile => {
    dispatch(profileActions.update(profile));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SaveProfileFields);
