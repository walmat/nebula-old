import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentProfile } from '../../state/selectors';
import { profileActions } from '../../../store/actions';

const Button = ({ onRemove, currentProfile, className, label }) => (
  <div className="row row--gutter row--end row--expand">
    <button type="button" className={className} onClick={() => onRemove(currentProfile)}>
      {label}
    </button>
  </div>
);

Button.propTypes = {
  className: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  label: ownProps.label,
  className: ownProps.className,
  currentProfile: makeCurrentProfile(state),
});

const mapDispatchToProps = dispatch => ({
  onRemove: profile => dispatch(profileActions.remove(profile.id)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Button);
