import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import NumberFormat from 'react-number-format';
import { buildStyle } from '../../styles';

import { makeDelays } from '../../settings/state/selectors';
import { SETTINGS_FIELDS, settingsActions } from '../../store/actions';

const Delays = ({ error, monitor, onDelayChange }) => (
  <>
    <div className="col col--end" style={{ marginLeft: 30 }}>
      <p className="row row--start tasks__label">Monitor</p>
      <NumberFormat
        value={monitor}
        placeholder={3500}
        className="row row--start bulk-action__monitor"
        style={buildStyle(false)}
        onChange={e => onDelayChange({ field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY, value: e })}
        required
      />
    </div>
    <div className="col col--end" style={{ marginLeft: 42 }}>
      <p className="row row--start tasks__label">Error</p>
      <NumberFormat
        value={error}
        placeholder={3500}
        className="row row--start bulk-action__error"
        style={buildStyle(false)}
        onChange={e => onDelayChange({ field: SETTINGS_FIELDS.EDIT_ERROR_DELAY, value: e })}
        required
      />
    </div>
  </>
);

Delays.propTypes = {
  monitor: PropTypes.number.isRequired,
  error: PropTypes.number.isRequired,
  onDelayChange: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({
  monitor: makeDelays(state).monitor,
  error: makeDelays(state).error,
});

export const mapDispatchToProps = dispatch => ({
  onDelayChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Delays);
