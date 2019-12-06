import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { profileActions, PROFILE_FIELDS } from '../../store/actions';

const saveProfile = (profiles, currentProfile, onCreate, onUpdate) => {
  // todo: simplify this!
  if (currentProfile.id) {
    // make sure the profile id exists in profiles before call in the load
    if (profiles.some(p => p.id === currentProfile.id)) {
      // first off, check to see if the profileName is taken..
      const profileExists = profiles.find(p => p.name === currentProfile.name);

      if (profileExists) {
        const { id } = profileExists;
        // eslint-disable-next-line no-param-reassign
        currentProfile.id = id;
        onUpdate(currentProfile);
      } else {
        // The current profile has the same id as a profile
        // in the profiles list, update that profile
        onCreate(currentProfile);
      }
    } else {
      // The current profile has an edit id, but it doesn't match
      // any on the profiles list, add this as a new profile.
      onCreate(currentProfile);
    }
  } else {
    // No edit id tag exists, add this as a new profile.
    onCreate(currentProfile);
  }
};

const SaveProfileFields = ({ profiles, currentProfile, onNameChange, onCreate, onUpdate }) => (
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
          onClick={() => saveProfile(profiles, currentProfile, onCreate, onUpdate)}
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

SaveProfileFields.propTypes = {
  profiles: PropTypes.arrayOf(PropTypes.any).isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
  onNameChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  profiles: state.Profiles,
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
