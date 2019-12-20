import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import NumberFormat from 'react-number-format';
import { buildStyle } from '../../../styles';

import { makeSelectedTasks } from '../../state/selectors';
import { makeDelays } from '../../../settings/state/selectors';
import { SETTINGS_FIELDS, settingsActions } from '../../../store/actions';

const Delays = ({ selected, monitor, onDelayChange }) => (
  <div className="col col--end" style={{ marginLeft: 30 }}>
    <NumberFormat
      value={monitor}
      placeholder={3500}
      className="row row--start bulk-action__monitor"
      style={buildStyle(false)}
      onChange={e =>
        onDelayChange({ field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY, value: e.target.value }, selected)
      }
      required
    />
  </div>
);

Delays.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.any).isRequired,
  monitor: PropTypes.number.isRequired,
  onDelayChange: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  monitor: makeDelays(state).monitor,
  selected: makeSelectedTasks(state),
});

export const mapDispatchToProps = dispatch => {
  return {
    onDelayChange: (changes, tasks) => dispatch(settingsActions.editDelays(changes.field, changes.value, tasks)),
  }
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Delays);
