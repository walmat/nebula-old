import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeCurrentProfile } from '../../state/selectors';
import { profileActions } from '../../../store/actions';

const Button = ({ onRemove, onDuplicate, currentProfile, className }) => (
  <div className="row row--gutter row--end row--expand">
    <button
      type="button"
      className={`col ${className}--duplicate`}
      onClick={() => onDuplicate(currentProfile)}
    >
      Duplicate
    </button>
    <button
      type="button"
      className={`${className}--delete`}
      onClick={() => onRemove(currentProfile)}
    >
      Delete
    </button>
  </div>
);

Button.propTypes = {
  className: PropTypes.string.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  currentProfile: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = (state, ownProps) => ({
  className: ownProps.className,
  currentProfile: makeCurrentProfile(state),
});

const mapDispatchToProps = dispatch => ({
  onDuplicate: profile => dispatch(profileActions.duplicate(profile)),
  onRemove: profile => dispatch(profileActions.remove(profile.id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Button);
